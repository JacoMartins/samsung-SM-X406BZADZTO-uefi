# Stage 1 plan: from stock tablet to "our code runs from recovery"

Device: Samsung Galaxy Tab S10 Lite 5G, **SM-X406B**, CSC **ZTO** (Brazil), Exynos 1380
(internal name **s5e8835**).

The end of this stage is not a UEFI shell. It is three smaller, checkable results:

1. You have the stock firmware, the kernel source and the decompiled device tree.
2. You have a written memory map, UART address and framebuffer address/format.
3. A tiny payload flashed to recovery runs and proves it by drawing on the screen.

Only after (3) works is it worth starting the EDK2 port (stage 3), because (3) proves
the boot chain, the entry conditions and the framebuffer — the things a UEFI port
silently depends on.

Anything marked **verify** is an expectation from similar Samsung devices, not a fact
checked on this tablet.

---

## Step 0 — Tools on your PC

- Odin (Windows) or Heimdall/odin4 (Linux) for flashing.
- Python 3, `lz4`, `dtc` (device-tree-compiler), `git`.
- AOSP `mkbootimg` tools (`mkbootimg.py`, `unpack_bootimg.py`) — from
  `https://android.googlesource.com/platform/system/tools/mkbootimg`.
- An aarch64 toolchain: `clang` + `lld`, or `aarch64-linux-gnu-gcc`.
- `avbtool` (same AOSP tree, `external/avb`) to build an empty vbmeta.
- Later: an EDK2 checkout.

## Step 1 — Back up and download stock firmware

1. In Settings → About tablet → Software information, note the **build number**
   (e.g. `X406BXXU1AYxx`). Everything below must match this build.
2. Download the full firmware for SM-X406B / ZTO with that exact build
   (Samsung's servers via tools such as Frija/Bifrost/SamFirm-style downloaders).
3. Unpack it:
   ```sh
   scripts/extract_firmware.sh path/to/AP_X406B....tar.md5 out/fw
   ```
   You should get at least `boot.img`, `recovery.img`, `vendor_boot.img`,
   `dtbo.img`, `vbmeta.img`. **Keep the original AP/BL/CP/CSC tar files** — they are
   your way back.

## Step 2 — Get the kernel source

1. Go to `https://opensource.samsung.com`, search **SM-X406B**, download the package
   whose version matches (or is closest to) your build number.
2. Unpack `Kernel.tar.gz`, then:
   ```sh
   scripts/grep_kernel_source.sh path/to/kernel out/kernel-facts.txt
   ```
   This lists the s5e8835 `.dtsi` files, the board `.dts` for the X406B, the
   defconfig, and the lines that mention memory, reserved-memory, UART, DECON
   (display), UFS and the GIC.

The source tree's device tree is the readable version; the DTB in the firmware is
the one actually used. Use both: source for names and comments, firmware DTB for
the final addresses.

## Step 3 — Unpack the images and decompile the device tree

```sh
scripts/unpack_images.sh out/fw out/unpacked
```

Things to write down from the output (into `docs/device-facts.md`):

| Fact | Where it comes from |
|---|---|
| Boot image header version of `boot.img` and `recovery.img` | `unpack_bootimg` output |
| Kernel load address, page size, `os_version`, `os_patch_level` | same |
| Whether `recovery.img` has its own ramdisk/DTB or relies on `vendor_boot` | same |
| `cmdline` (bootconfig) passed by S-Boot | `vendor_boot` header + `/proc/cmdline` on device |
| Board DTB that matches this tablet (several may be packed together) | `vendor_boot` dtb section; match `model`/`compatible` |

**Important expectation (verify):** on Samsung devices with `vendor_boot`, S-Boot
picks the DTB itself, applies the DTBO overlays, patches in memory size and the
cmdline, and passes its address to the kernel in **x0**, following the arm64 Linux
boot protocol. If that holds here, the UEFI payload does not need an appended DTB —
it can read the live memory map from x0 at runtime. Stage 2 checks this.

**Second expectation (verify):** Samsung kept a separate `recovery` partition on
devices launched with Android 13+/GKI (TWRP for recent Galaxy models is still
flashed as `recovery.img`). Confirm by checking that `recovery.img` exists in the
AP tar and that the partition is listed in `/dev/block/by-name` (needs root or
an adb shell from stock recovery).

## Step 4 — Draft the memory map

```sh
scripts/dts_memmap.py out/unpacked/dts/<board>.dts > docs/memory-map.md
```

It extracts:

- `/memory` nodes (DRAM banks). The DTB in the firmware often has placeholder sizes
  that S-Boot fills in; take real sizes from a running device:
  `adb shell cat /proc/iomem` (root) or `/sys/firmware/fdt` (root), or from the
  stage-2 payload dump.
- `/reserved-memory` children with `reg` — these must be marked as reserved in
  UEFI or the OS will overwrite firmware (modem, TEE, secure world, logs). Regions
  with only `size`/`alloc-ranges` are dynamic and are allocated by Linux; UEFI can
  ignore them.
- Nodes that look like the boot framebuffer (`framebuffer`, `fb_handover`,
  `decon`, `simple-framebuffer`) and the DECON register base.
- UART nodes (`uart`, `serial`, `samsung,exynos*-uart`) with their `reg`. On
  production units the UART is usually not wired to an accessible connector (the
  debug path is often via the USB/earphone jack with a special cable — verify), so
  plan for the **screen** to be your only debug output.
- The GIC (`arm,gic-v3`) distributor/redistributor bases — the Exynos 7570 port
  crashed with a GIC exception on a second phone, so get these right early.

Also record from the defconfig/`.dtsi`: page size (4K expected), whether PSCI is
used for CPU on/off (`psci` node, method `smc`), and the timer frequency
(`arm,armv8-timer`, `clock-frequency`).

## Step 5 — Framebuffer

S-Boot draws the Samsung logo, so DECON is already scanning out a buffer when it
jumps to the kernel. You need:

- **Physical address** of that buffer. Look for a reserved-memory region named like
  `fb_handover`/`framebuffer`/`decon` in the DTB, or a cmdline argument passed by
  S-Boot. On the device (root) `/proc/iomem` and `dmesg | grep -i -E "decon|fb|handover"`
  usually print it.
- **Resolution** (S10 Lite panel: expected 1340×800 or 2000×1200 class — read it
  from the panel node, do not guess), **stride**, and **pixel format** (usually
  32-bit ARGB/ABGR/XRGB on Exynos — test both channel orders).

Stage 2 will paint a known pattern there; the colours you see tell you the format.

## Step 6 — Unlock and disable verified boot

1. Settings → Developer options → **OEM unlocking** on. (Some carrier/region
   firmwares hide it until the device has been online for several days.)
2. Power off, hold **Vol Up + Vol Down** and plug in USB → long-press Vol Up to
   unlock. This **wipes the device** and trips Knox (warranty bit 0x1, permanent).
3. Boot once, complete setup, connect to the internet, check OEM unlocking still
   shows as on (avoids the "KG/RMM prenormal" lock — verify current behaviour on
   this model).
4. Build an empty vbmeta that disables verification:
   ```sh
   avbtool make_vbmeta_image --flags 3 --padding_size 4096 --output vbmeta_disabled.img
   ```
   Package it with the stock (unmodified) `boot.img` into a tar for Odin's AP slot
   (`tar -H ustar -cf vbmeta_disabled.tar vbmeta.img`, renaming the file to
   `vbmeta.img`). Flash, then confirm One UI still boots normally.

At this point nothing visible has changed except the unlock warning screen. That is
the baseline to return to.

## Step 7 — Stage 2 payload: prove our code runs from recovery

Before writing UEFI, flash something that cannot fail in complicated ways:

1. Build `stub/` (see `stub/README.md`). The stub is a valid arm64 Linux `Image`
   header followed by a few instructions that:
   - save x0 (the DTB pointer S-Boot passes),
   - fill the framebuffer with colour bars,
   - write the x0 value and CurrentEL as a hex bar pattern,
   - spin forever.
2. Wrap it as `recovery.img` using the **same header version, page size,
   os_version and os_patch_level** as the stock `recovery.img` (S-Boot may reject
   an image whose patch level is lower than what's recorded — verify). Keep the
   stock ramdisk in it; S-Boot may refuse a recovery image without one.
   `scripts/make_recovery.sh` does this: it copies every field from the stock image
   and swaps only the kernel.
3. Flash the resulting `recovery.tar` in Odin's AP slot. Reboot with
   **Vol Up + Power** (on tablets, while connected to USB if it doesn't trigger
   otherwise — verify).

Outcomes and what they mean:

| What you see | Meaning | Next |
|---|---|---|
| Colour bars | Our code runs, framebuffer address/format right | Read x0/EL from the pattern, go to stage 3 |
| Garbled bars / wrong colours | Code runs, stride or format wrong | Adjust and retry |
| Logo stays frozen | Code probably runs, wrong framebuffer address | Try other candidate addresses |
| "Only official released binaries are allowed" / boot refused | Unlock or vbmeta incomplete | Recheck Step 6 |
| Reboots to download mode / stock OS | Image rejected or crashed early | Compare header fields to stock |

Restore stock recovery at any time by flashing the original `recovery.img` from
the AP tar.

## Step 8 — Exit criteria for stage 1/2

You are ready for the EDK2 port when you have, in `docs/device-facts.md`:

- [ ] DRAM base(s) and size(s) as seen at runtime
- [ ] Every fixed `reserved-memory` region
- [ ] Framebuffer base, width, height, stride, pixel format — confirmed on screen
- [ ] Exception level at entry (EL1 expected on Samsung; EL2 is unlikely — verify)
- [ ] Confirmation that x0 holds a valid DTB at entry
- [ ] GIC-v3 distributor and redistributor bases, timer frequency, PSCI method
- [ ] UFS host controller base address and which partition/LUN you'll put the OS on
- [ ] A recovery image that S-Boot accepts and that runs your code

## What stage 3 will look like (preview)

- Start from an existing Exynos/Qualcomm EDK2 platform as a template (Renegade's
  `edk2-platforms` style layout, or ArmVirtPkg's relocatable PrePi).
- SEC/PrePi: take x0 → parse DTB → build HOBs for memory, mark reserved regions.
- `SimpleFbDxe`-style GOP driver over the S-Boot framebuffer.
- Timer and GIC from the values above; no ARM Trusted Firmware changes needed
  (EL3 stays Samsung's).
- Target: UEFI shell on screen, driven by volume keys (GPIO) since touch needs a
  real driver.
