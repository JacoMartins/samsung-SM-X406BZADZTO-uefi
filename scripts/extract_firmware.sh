#!/usr/bin/env bash
# Unpack a Samsung AP_*.tar.md5 and decompress the .lz4 images inside.
# Usage: extract_firmware.sh AP_....tar.md5 OUTDIR
set -euo pipefail
[[ $# -eq 2 ]] || { echo "usage: $0 AP_xxx.tar.md5 OUTDIR" >&2; exit 1; }
ap="$1"; out="$2"
command -v lz4 >/dev/null || { echo "lz4 not found (apt install lz4)" >&2; exit 1; }
mkdir -p "$out"

# .tar.md5 is a tar with an md5 line appended; tar ignores the trailer.
want='boot.img* recovery.img* vendor_boot.img* dtbo.img* vbmeta.img* vbmeta_system.img* dtb.img*'
# shellcheck disable=SC2086
tar -xf "$ap" -C "$out" --wildcards $want 2>/dev/null || true

for f in "$out"/*.lz4; do
  [[ -e "$f" ]] || continue
  lz4 -d -f -q "$f" "${f%.lz4}" && rm -f "$f"
done

echo "Extracted to $out:"
ls -l "$out"
for img in boot recovery vendor_boot; do
  [[ -f "$out/$img.img" ]] || echo "warning: $img.img not found in $ap" >&2
done
