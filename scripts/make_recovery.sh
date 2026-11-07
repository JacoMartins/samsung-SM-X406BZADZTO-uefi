#!/usr/bin/env bash
# Repack the stock recovery.img with a new kernel (our payload), keeping every
# other header field (header version, page size, os_version, os_patch_level,
# ramdisk, cmdline, dtb) identical to stock, then tar it for Odin's AP slot.
#
# Usage: make_recovery.sh STOCK_recovery.img PAYLOAD.Image OUTDIR
# Needs AOSP mkbootimg + unpack_bootimg (system/tools/mkbootimg).
#
# Untested on the SM-X406B: compare `unpack_bootimg --format=info` of the result
# with the stock image before flashing.
set -euo pipefail
[[ $# -eq 3 ]] || { echo "usage: $0 STOCK_recovery.img PAYLOAD.Image OUTDIR" >&2; exit 1; }
stock="$1"; payload="$2"; out="$3"

pick() { for c in "$@"; do command -v "$c" >/dev/null && { echo "$c"; return; }; done; }
unpack=$(pick unpack_bootimg unpack_bootimg.py)
mkboot=$(pick mkbootimg mkbootimg.py)
[[ -n "$unpack" && -n "$mkboot" ]] || { echo "need unpack_bootimg and mkbootimg in PATH" >&2; exit 1; }

mkdir -p "$out"
work="$out/stock-recovery"

# NUL-separated mkbootimg arguments that reproduce the stock image.
mapfile -d '' args < <("$unpack" --boot_img "$stock" --out "$work" --format=mkbootimg -0)

found=0
for i in "${!args[@]}"; do
  if [[ "${args[$i]}" == "--kernel" ]]; then
    args[$((i + 1))]="$payload"; found=1
  fi
done
[[ $found -eq 1 ]] || { echo "stock image has no --kernel argument?" >&2; exit 1; }

"$mkboot" "${args[@]}" --output "$out/recovery.img"

# Samsung images end with this marker; without it S-Boot may show an extra
# warning on unlocked devices. Harmless to append (verify on this model).
printf 'SEANDROIDENFORCE' >> "$out/recovery.img"

( cd "$out" && tar -H ustar -cf recovery.tar recovery.img )
echo "Wrote $out/recovery.img and $out/recovery.tar (flash recovery.tar in Odin's AP slot)."
echo "Header check:"
"$unpack" --boot_img "$out/recovery.img" --out "$out/check" --format=info | head -n 20
