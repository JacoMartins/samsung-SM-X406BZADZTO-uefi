# SM-X406B device facts

Fill in as you confirm each item. Note the source (DTB, kernel source, /proc/iomem,
fbtest screen) next to every value. Unconfirmed values go in the "guess" column.

Firmware build: `X406BXXS8CZI2` (must match the kernel source and the images used)

As read from Settings → About tablet → Software information on 2026-11-20:

- One UI 8.5, Android 16, security patch 2026-09-05
- Build `BP4A.251205.006.X406BXXS8CZI2`, CSC `SAOMC_SM-X406B_OWO_ZTO_16_0006`
- Kernel `5.15.189-android13-3` (GKI 5.15), built 2026-09-10
- Bootloader revision (binary) **8**: the digit after `XXS`. Firmware with a lower
  revision cannot be flashed, so downgrading to One UI 7 is not possible
- OEM unlocking: **not shown** in Developer options
- Device codename: `gts10lite`

ADB `getprop` results (2026-11-21):

| Property | Value | Meaning |
|---|---|---|
| `ro.oem_unlock_supported` | *(empty)* | firmware does not offer bootloader unlocking |
| `sys.oem_unlock_allowed` | *(empty)* | no unlock toggle exists |
| `ro.boot.flash.locked` | `1` | bootloader locked |
| `ro.boot.verifiedbootstate` | `green` | verified boot, stock images |
| `ro.boot.warranty_bit` | `0` | Knox not tripped |
| `ro.boot.bootloader` | `X406BXXS8CZI2` | bootloader revision 8 |

**Conclusion: this unit cannot be bootloader-unlocked on current firmware.**

| Item | Value | Source | Confirmed? |
|---|---|---|---|
| SoC | Exynos 1380 (s5e8835) | Samsung spec | yes |
| Bootloader unlockable | no | getprop (ro.oem_unlock_supported empty) | yes |
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

## Same-SoC device checked: Galaxy A54 5G (SM-A546E, `a54x`)

2026-11-21, via ADB: build `CP2A.260605.016.A546EXXUNGZJ5`, bootloader
`A546EXXUNGZJ5` (revision N), `ro.oem_unlock_supported` empty,
`sys.oem_unlock_allowed` empty, `ro.boot.flash.locked` = 1.
**Not unlockable either**; not usable as an alternative bring-up target.
