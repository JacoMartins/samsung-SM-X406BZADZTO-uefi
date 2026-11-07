# Samsung SM-X406B (Galaxy Tab S10 Lite 5G, Exynos 1380) — UEFI bring-up

Goal: boot a UEFI firmware image (EDK2) from the **recovery** partition, chain-loaded
by Samsung's stock S-Boot, while the **boot** partition keeps booting One UI.

```
Power            -> S-Boot -> boot.img     -> One UI (unchanged)
Vol Up + Power   -> S-Boot -> recovery.img -> UEFI -> boot menu -> other OS
```

This follows the approach used by the Renegade Project (Snapdragon 845) and the
Exynos 7570 UEFI port: the UEFI firmware is wrapped so it looks like an arm64 Linux
`Image`, and the stock bootloader loads it like a kernel.

## Status

| Stage | What | State |
|---|---|---|
| 0 | Unlock, dump firmware, get kernel source | plan written |
| 1 | Hardware facts: memory map, UART, framebuffer, UFS | tools written |
| 2 | "Hello world" payload in recovery (prove S-Boot runs our code) | stub written and emulator-tested, not run on device |
| 3 | EDK2 platform package, boot to UEFI shell on the framebuffer | not started |
| 4 | UFS / SD storage driver, boot menu | not started |

## Layout

- `docs/stage1-plan.md` — step-by-step plan for the first stage (read this first)
- `docs/device-facts.md` — checklist of hardware facts to fill in
- `scripts/extract_firmware.sh` — unpack a Samsung `AP_*.tar.md5` into raw images
- `scripts/unpack_images.sh` — split boot/recovery/vendor_boot images, pull out DTBs, decompile them
- `scripts/split_dtb.py` — split concatenated DTBs out of a blob
- `scripts/make_recovery.sh` — repack stock recovery.img with a new kernel/payload, tar for Odin
- `scripts/dts_memmap.py` — draft a memory map (RAM, reserved regions, framebuffer, UART) from a `.dts`
- `scripts/grep_kernel_source.sh` — find the Exynos 1380 (s5e8835) facts in Samsung's kernel source
- `stub/` — minimal arm64 Linux-Image header + entry stub, and `wrap_fd.sh` to wrap an EDK2 `.fd`

## Warning

Unlocking the bootloader trips Knox permanently (Samsung Pay, Secure Folder and some
banking apps stop working) and wipes user data. Keep a full copy of the stock firmware
for your exact build so you can restore with Odin.
