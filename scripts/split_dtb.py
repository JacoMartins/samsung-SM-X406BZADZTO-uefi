#!/usr/bin/env python3
"""Split a blob containing one or more concatenated FDTs into separate .dtb files.

Usage: split_dtb.py BLOB OUT_PREFIX
Writes OUT_PREFIX-0.dtb, OUT_PREFIX-1.dtb, ...
Scans for the FDT magic, so it also works for blobs with a vendor header in front.
"""
import struct
import sys

FDT_MAGIC = b"\xd0\x0d\xfe\xed"


def split(data: bytes):
    pos = 0
    while True:
        i = data.find(FDT_MAGIC, pos)
        if i < 0 or i + 40 > len(data):
            return
        totalsize, off_struct, off_strings = struct.unpack_from(">III", data, i + 4)
        version = struct.unpack_from(">I", data, i + 20)[0]
        sane = (
            40 <= totalsize <= len(data) - i
            and off_struct <= totalsize
            and off_strings <= totalsize
            and 16 <= version <= 17
        )
        if sane:
            yield i, data[i : i + totalsize]
            pos = i + totalsize
        else:
            pos = i + 4


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    data = open(sys.argv[1], "rb").read()
    n = 0
    for off, dtb in split(data):
        name = f"{sys.argv[2]}-{n}.dtb"
        with open(name, "wb") as f:
            f.write(dtb)
        print(f"{name}: offset 0x{off:x}, {len(dtb)} bytes")
        n += 1
    if n == 0:
        print(f"no FDT found in {sys.argv[1]}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
