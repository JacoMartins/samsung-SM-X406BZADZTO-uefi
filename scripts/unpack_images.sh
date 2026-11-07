#!/usr/bin/env bash
# Unpack boot/recovery/vendor_boot, extract DTBs and decompile them to .dts.
# Usage: unpack_images.sh FW_DIR OUTDIR
# Needs: unpack_bootimg (or unpack_bootimg.py) from AOSP mkbootimg, dtc, python3.
set -euo pipefail
[[ $# -eq 2 ]] || { echo "usage: $0 FW_DIR OUTDIR" >&2; exit 1; }
fw="$1"; out="$2"
here="$(cd "$(dirname "$0")" && pwd)"

unpack=""
for c in unpack_bootimg unpack_bootimg.py; do
  command -v "$c" >/dev/null && { unpack="$c"; break; }
done
[[ -n "$unpack" ]] || { echo "unpack_bootimg not found (AOSP system/tools/mkbootimg)" >&2; exit 1; }
command -v dtc >/dev/null || { echo "dtc not found (apt install device-tree-compiler)" >&2; exit 1; }

mkdir -p "$out/dtb" "$out/dts"
for img in boot recovery vendor_boot; do
  [[ -f "$fw/$img.img" ]] || continue
  echo "=== $img.img ==="
  "$unpack" --boot_img "$fw/$img.img" --out "$out/$img" --format=info | tee "$out/$img.info.txt" || \
    "$unpack" --boot_img "$fw/$img.img" --out "$out/$img" | tee "$out/$img.info.txt"
done

# Split every file that may contain concatenated DTBs (vendor_boot dtb, recovery dtb, dtb.img).
for blob in "$out"/vendor_boot/dtb "$out"/recovery/dtb "$out"/boot/dtb "$fw"/dtb.img; do
  [[ -f "$blob" ]] || continue
  python3 -I "$here/split_dtb.py" "$blob" "$out/dtb/$(basename "$(dirname "$blob")")"
done

for d in "$out"/dtb/*.dtb; do
  [[ -e "$d" ]] || continue
  dtc -q -I dtb -O dts -o "$out/dts/$(basename "${d%.dtb}").dts" "$d" || true
done

echo
echo "Decompiled device trees:"
for s in "$out"/dts/*.dts; do
  [[ -e "$s" ]] || continue
  model=$(grep -m1 -E '^\s*model\s*=' "$s" | sed 's/^\s*//')
  echo "  $(basename "$s"): $model"
done
echo
echo "Note: dtbo.img holds overlays; S-Boot applies them on top of the base DTB."
echo "Next: scripts/dts_memmap.py $out/dts/<board>.dts"
