/*
 * Wrap an EDK2 firmware volume (.fd) so S-Boot loads it as a Linux kernel.
 * The FD is placed 4 KiB into the image; x0 (DTB pointer) is passed through.
 * The FD's SEC/PrePi must be position-independent (ArmVirtPkg-style relocatable
 * PrePi) or be built for the address S-Boot loads the kernel to + 0x1000.
 *
 * Build-time parameter: FD_FILE (path to the .fd, as a string).
 */
#ifndef FD_FILE
#error "define FD_FILE"
#endif

	.text
	.globl	_head
_head:
#include "linux_header.inc"

start:
	adr	x1, payload
	br	x1			/* x0 still holds the DTB address */

	.balign	4096
payload:
	.incbin	FD_FILE

	.balign	16
_end:
