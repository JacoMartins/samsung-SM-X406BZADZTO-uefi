#!/usr/bin/env python3
"""Draft a memory map from a decompiled device tree (dtc -O dts output).

Usage: dts_memmap.py BOARD.dts > memory-map.md

Prints Markdown tables of:
  - DRAM banks (/memory nodes)
  - fixed reserved-memory regions (have `reg`) and dynamic ones (size only)
  - framebuffer / display candidates
  - UART, GIC, UFS, timer, PSCI nodes and their register ranges

Addresses are translated through #address-cells/#size-cells of each parent, but
NOT through `ranges` (on Exynos the SoC bus maps 1:1, so this is normally fine).
"""
import re
import sys

NODE_OPEN = re.compile(r"^\s*(?:([\w\-]+)\s*:\s*)?([^\s{=;]+)\s*\{\s*$")
NODE_CLOSE = re.compile(r"^\s*\}\s*;\s*$")
PROP = re.compile(r"^\s*([^\s=;]+)\s*(?:=\s*(.*?))?\s*;\s*$")


class Node:
    def __init__(self, name, parent=None):
        self.name = name
        self.parent = parent
        self.props = {}
        self.children = []

    @property
    def path(self):
        if self.parent is None:
            return "/"
        p = self.parent.path
        return (p if p != "/" else "") + "/" + self.name

    def cells(self, key, default):
        v = self.props.get(key)
        ints = parse_cells(v) if v else None
        return ints[0] if ints else default

    def walk(self):
        yield self
        for c in self.children:
            yield from c.walk()


def parse(text):
    root = None
    cur = None
    pending = ""
    for raw in text.splitlines():
        line = raw.split("//")[0].rstrip()
        if not line.strip() or line.strip().startswith("/dts-v1/") or line.strip().startswith("/memreserve/"):
            continue
        if pending:
            line = pending + " " + line.strip()
            pending = ""
        m = NODE_OPEN.match(line)
        if m:
            n = Node(m.group(2), cur)
            if cur is None:
                root = n
            else:
                cur.children.append(n)
            cur = n
            continue
        if NODE_CLOSE.match(line):
            cur = cur.parent if cur is not None else None
            continue
        if not line.rstrip().endswith(";"):
            pending = line  # property spanning lines
            continue
        m = PROP.match(line)
        if m and cur is not None:
            cur.props[m.group(1)] = m.group(2) or ""
    return root


def parse_cells(v):
    out = []
    for grp in re.findall(r"<([^>]*)>", v or ""):
        for tok in grp.split():
            try:
                out.append(int(tok, 0))
            except ValueError:
                out.append(None)  # phandle reference like &foo
    return out


def parse_str(v):
    return re.findall(r'"([^"]*)"', v or "")


def regs(node):
    if "reg" not in node.props or node.parent is None:
        return []
    ac = node.parent.cells("#address-cells", 2)
    sc = node.parent.cells("#size-cells", 1)
    cells = parse_cells(node.props["reg"])
    if None in cells or ac + sc == 0:
        return []
    out = []
    for i in range(0, len(cells) - (ac + sc) + 1, ac + sc):
        a = 0
        for c in cells[i : i + ac]:
            a = (a << 32) | c
        s = 0
        for c in cells[i + ac : i + ac + sc]:
            s = (s << 32) | c
        out.append((a, s))
    return out


def size_only(node):
    if "size" not in node.props or node.parent is None:
        return None
    sc = node.parent.cells("#size-cells", 1)
    cells = parse_cells(node.props["size"])
    if not cells or None in cells:
        return None
    s = 0
    for c in cells[:sc]:
        s = (s << 32) | c
    return s


def hx(v):
    return f"0x{v:09x}" if v >= 1 << 32 else f"0x{v:08x}"


def human(n):
    for unit, div in (("GiB", 1 << 30), ("MiB", 1 << 20), ("KiB", 1 << 10)):
        if n >= div and n % (div // 16 or 1) == 0:
            return f"{n / div:g} {unit}"
    return f"{n} B"


def flags(node):
    return ", ".join(k for k in ("no-map", "reusable") if k in node.props) or "-"


def compat(node):
    return ", ".join(parse_str(node.props.get("compatible"))) or "-"


def table(rows, header):
    print("| " + " | ".join(header) + " |")
    print("|" + "---|" * len(header))
    for r in rows:
        print("| " + " | ".join(str(c) for c in r) + " |")
    if not rows:
        print("| " + " | ".join(["(none found)"] + [""] * (len(header) - 1)) + " |")
    print()


CATEGORIES = [
    ("Framebuffer / display", re.compile(r"framebuffer|fb_handover|fb-handover|decon|dpu|dsim|panel", re.I)),
    ("UART", re.compile(r"uart|serial", re.I)),
    ("Interrupt controller (GIC)", re.compile(r"gic|interrupt-controller", re.I)),
    ("UFS storage", re.compile(r"ufs", re.I)),
    ("SD card", re.compile(r"dwmmc|mmc|sdhci", re.I)),
    ("Timer / PSCI", re.compile(r"armv8-timer|^timer|psci", re.I)),
    ("GPIO keys / pinctrl", re.compile(r"gpio-keys|pinctrl@", re.I)),
]


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    root = parse(open(sys.argv[1], encoding="utf-8", errors="replace").read())
    if root is None:
        sys.exit("could not parse device tree")

    print(f"# Memory map draft from `{sys.argv[1]}`\n")
    print(f"- model: {', '.join(parse_str(root.props.get('model'))) or '-'}")
    print(f"- compatible: {compat(root)}\n")
    print("Generated by scripts/dts_memmap.py. DRAM sizes in a firmware DTB are often")
    print("placeholders patched by S-Boot at boot; confirm against the running device.\n")

    nodes = list(root.walk())

    print("## DRAM\n")
    rows = []
    for n in nodes:
        if n.props.get("device_type", "").strip() == '"memory"' or re.match(r"memory(@|$)", n.name):
            if n.parent is not None and n.parent.parent is None:
                for a, s in regs(n):
                    rows.append((n.path, hx(a), hx(a + s - 1) if s else "-", human(s) if s else "0 (patched at boot?)"))
    table(rows, ["node", "start", "end", "size"])

    rmem = [n for n in nodes if n.parent is not None and n.parent.name == "reserved-memory"]
    print("## Reserved memory — fixed (must be reserved in UEFI)\n")
    rows = []
    for n in rmem:
        for a, s in regs(n):
            rows.append((n.name, hx(a), hx(a + s - 1), human(s), flags(n), compat(n)))
    rows.sort(key=lambda r: int(r[1], 16))
    table(rows, ["region", "start", "end", "size", "flags", "compatible"])

    print("## Reserved memory — dynamic (allocated by Linux; UEFI can ignore)\n")
    rows = []
    for n in rmem:
        if not regs(n):
            s = size_only(n)
            rows.append((n.name, human(s) if s else "-", flags(n), n.props.get("alloc-ranges", "-")))
    table(rows, ["region", "size", "flags", "alloc-ranges"])

    seen = set()
    for title, rx in CATEGORIES:
        rows = []
        for n in nodes:
            if n.path in seen or n.parent is None or n.parent.name == "reserved-memory":
                continue
            if rx.search(n.name) or rx.search(compat(n)):
                rs = regs(n)
                rng = "; ".join(f"{hx(a)}+{hx(s)}" for a, s in rs) or "-"
                status = parse_str(n.props.get("status")) or ["okay"]
                rows.append((n.path, compat(n), rng, status[0]))
                seen.add(n.path)
        print(f"## {title}\n")
        table(rows[:60], ["node", "compatible", "reg (base+size)", "status"])

    chosen = next((n for n in nodes if n.path == "/chosen"), None)
    if chosen:
        print("## /chosen\n")
        for k, v in chosen.props.items():
            print(f"- `{k}` = `{v[:200]}`")
        print()


if __name__ == "__main__":
    main()
