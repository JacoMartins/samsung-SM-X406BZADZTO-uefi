# SM-X406B device facts

Fill in as you confirm each item. Note the source (DTB, kernel source, /proc/iomem,
fbtest screen) next to every value. Unconfirmed values go in the "guess" column.

Firmware build: `X406B...` (must match the kernel source and the images used)

| Item | Value | Source | Confirmed? |
|---|---|---|---|
| SoC | Exynos 1380 (s5e8835) | Samsung spec | yes |
| boot.img header version | | unpack_bootimg | |
| recovery.img header version | | unpack_bootimg | |
| recovery partition exists | | AP tar / by-name | |
| Kernel load address | | unpack_bootimg | |
| os_version / os_patch_level | | unpack_bootimg | |
| DRAM bank 0 base / size | | /proc/iomem, DTB | |
| DRAM bank 1 base / size | | | |
| Fixed reserved-memory regions | see memory-map.md | DTB | |
| Framebuffer base | | DTB / dmesg / fbtest | |
| Framebuffer width × height | | panel node / fbtest | |
| Framebuffer stride (bytes) | | fbtest | |
| Pixel format | | fbtest colour bars | |
| Exception level at entry | | fbtest | |
| x0 at entry (DTB pointer) | | fbtest | |
| GIC-v3 distributor base | | DTB | |
| GIC-v3 redistributor base | | DTB | |
| Arch timer frequency | | DTB / CNTFRQ_EL0 | |
| PSCI method | | DTB | |
| UART base (and whether reachable) | | DTB | |
| UFS host controller base | | DTB | |
| SD card controller base | | DTB | |
| Volume key GPIOs | | DTB gpio-keys | |
