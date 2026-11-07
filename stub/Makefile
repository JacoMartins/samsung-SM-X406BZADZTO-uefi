# Build the stage-2 framebuffer test payload, or wrap an EDK2 .fd.
#
#   make fbtest FB_BASE=0x... FB_WIDTH=... FB_HEIGHT=... [FB_STRIDE=bytes]
#   make fd FD=path/to/DEVICE_EFI.fd
#
# Override tools on the command line, e.g. CC=aarch64-linux-gnu-gcc TARGET= LD=aarch64-linux-gnu-ld.
# There are no defaults for the framebuffer: take the values from
# docs/device-facts.md (stage 1, step 5).

CC      = clang
TARGET  ?= --target=aarch64-linux-gnu
OBJCOPY = llvm-objcopy
LD      = ld.lld

FB_STRIDE ?= $(shell echo $$(( $(FB_WIDTH) * 4 )))
FD        ?=

CFLAGS = $(TARGET) -nostdlib -ffreestanding -fno-pic

.PHONY: fbtest fd clean
fbtest: build/fbtest.Image
fd: build/uefi.Image

build/fbtest.o: fbtest.S linux_header.inc
	@[ -n "$(FB_BASE)" ] && [ -n "$(FB_WIDTH)" ] && [ -n "$(FB_HEIGHT)" ] || \
	  { echo "error: set FB_BASE, FB_WIDTH, FB_HEIGHT (and FB_STRIDE if not WIDTH*4)" >&2; exit 1; }
	@mkdir -p build
	$(CC) $(CFLAGS) -c $< -o $@ \
	  -DFB_BASE=$(FB_BASE) -DFB_WIDTH=$(FB_WIDTH) -DFB_HEIGHT=$(FB_HEIGHT) -DFB_STRIDE=$(FB_STRIDE)

build/fd_wrapper.o: fd_wrapper.S linux_header.inc $(FD)
	@[ -n "$(FD)" ] || { echo "error: set FD=path/to/firmware.fd" >&2; exit 1; }
	@mkdir -p build
	$(CC) $(CFLAGS) -c $< -o $@ -DFD_FILE='"$(abspath $(FD))"'

build/%.elf: build/%.o image.lds
	$(LD) -T image.lds $< -o $@

build/fbtest.Image: build/fbtest.elf
	$(OBJCOPY) -O binary $< $@
	@echo "built $@ ($$(stat -c %s $@) bytes)"

build/uefi.Image: build/fd_wrapper.elf
	$(OBJCOPY) -O binary $< $@
	@echo "built $@ ($$(stat -c %s $@) bytes)"

clean:
	$(RM) build/*.o build/*.elf build/*.Image
