# Payload stub

Two tiny programs that S-Boot can load from the recovery partition as if they were
an arm64 Linux kernel (`linux_header.inc` provides the 64-byte Image header).

## `fbtest` — stage 2: prove our code runs

```sh
make fbtest FB_BASE=0x<addr> FB_WIDTH=<px> FB_HEIGHT=<px> FB_STRIDE=<bytes>
../scripts/make_recovery.sh ../out/fw/recovery.img build/fbtest.Image ../out/recovery-fbtest
# flash ../out/recovery-fbtest/recovery.tar in Odin's AP slot, boot with Vol Up + Power
```

Screen layout (32 bpp):

| Band | Shows | How to read it |
|---|---|---|
| Top half | 8 bars: white, yellow, cyan, green, magenta, red, blue, black | If bar 6 is blue and bar 7 red, swap: the format is ABGR. Slanted bars = wrong stride |
| 3rd quarter | x0 at entry, 64 bits, MSB left | Light = 1, dark = 0; shade changes every 4 bits so you can read hex digits. Should be a DTB address in DRAM |
| Last quarter | CurrentEL as N red blocks out of 4 | 1 block = EL1 (expected), 2 = EL2 |

Checked in an emulator (Unicorn) with a fake framebuffer; **not yet run on the
tablet**.

## `fd` — stage 3: wrap an EDK2 firmware image

```sh
make fd FD=path/to/SM_X406B_EFI.fd
../scripts/make_recovery.sh ../out/fw/recovery.img build/uefi.Image ../out/recovery-uefi
```

The header jumps to the FD placed at offset 0x1000 with x0 (DTB) intact. The FD's
first stage must be position-independent or linked for that address.

## Toolchain

Defaults to `clang` + `ld.lld` + `llvm-objcopy`. For GCC:
`make fbtest CC=aarch64-linux-gnu-gcc TARGET= LD=aarch64-linux-gnu-ld OBJCOPY=aarch64-linux-gnu-objcopy ...`
