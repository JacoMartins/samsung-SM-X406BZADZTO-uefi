#!/usr/bin/env bash
# Collect Exynos 1380 (s5e8835) hardware facts from Samsung's kernel source.
# Usage: grep_kernel_source.sh KERNEL_SRC_DIR OUTFILE
set -euo pipefail
[[ $# -eq 2 ]] || { echo "usage: $0 KERNEL_SRC_DIR OUTFILE" >&2; exit 1; }
src="$1"; out="$2"
soc_re='s5e8835|exynos1380'

{
  echo "# Kernel source facts for SM-X406B ($(date -u +%F))"
  echo
  echo "## Device-tree files mentioning the SoC"
  grep -rlIE "$soc_re" --include='*.dts' --include='*.dtsi' --include='*.dtso' "$src" 2>/dev/null | sort
  echo
  echo "## Device-tree files mentioning the model (X406 / gts10lite-style codenames)"
  grep -rlIiE 'x406|x400|gts10' --include='*.dts' --include='*.dtsi' --include='*.dtso' --include='Makefile' "$src" 2>/dev/null | sort
  echo
  echo "## Defconfigs"
  find "$src" -path '*configs*' -iname "*${soc_re%%|*}*" 2>/dev/null | sort
  grep -rlIE 'x406|gts10' "$src"/arch/arm64/configs 2>/dev/null | sort || true
  echo
  for topic in \
    'memory@|device_type = "memory"' \
    'reserved-memory|no-map|reusable' \
    'framebuffer|fb_handover|decon|simple-framebuffer' \
    'uart|serial@|exynos.*-uart|console=' \
    'gic-v3|interrupt-controller@|redistributor' \
    'ufs@|exynos.*-ufs|ufshc' \
    'psci|enable-method' \
    'armv8-timer|clock-frequency' \
    'gpio-keys|volume|KEY_VOLUME'; do
    echo "## $topic"
    grep -rnIE "$topic" --include='*.dts' --include='*.dtsi' --include='*.dtso' "$src" 2>/dev/null \
      | grep -iE "$soc_re|x406|gts10" | head -n 200 || true
    echo
  done
} > "$out"
echo "Wrote $out ($(wc -l < "$out") lines)"
