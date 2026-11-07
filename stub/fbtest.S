/*
 * Stage-2 test payload: proves S-Boot runs our code from the recovery partition.
 *
 * Entry (arm64 Linux boot protocol): x0 = DTB address, MMU off, D-cache off.
 * Draws on the framebuffer S-Boot left running:
 *   top half      : 8 colour bars  white yellow cyan green magenta red blue black
 *                   (red and blue swapped => framebuffer is ABGR, not ARGB)
 *   third quarter : the 64 bits of x0, MSB on the left. 1 = white/light grey,
 *                   0 = dark grey; shade alternates every 4 bits (one hex digit)
 *   last quarter  : 4 blocks, the first CurrentEL of them red (EL1 => 1 red block)
 * then sleeps forever.
 *
 * Build-time parameters (bytes / pixels, 32 bpp assumed):
 *   FB_BASE FB_WIDTH FB_HEIGHT FB_STRIDE
 */
#if !defined(FB_BASE) || !defined(FB_WIDTH) || !defined(FB_HEIGHT) || !defined(FB_STRIDE)
#error "define FB_BASE, FB_WIDTH, FB_HEIGHT and FB_STRIDE"
#endif

	.text
	.globl	_head
_head:
#include "linux_header.inc"

start:
	mov	x19, x0			/* DTB pointer from S-Boot */
	mrs	x20, CurrentEL
	ubfx	x20, x20, #2, #2	/* exception level 0..3 */

	ldr	x21, =FB_BASE
	ldr	x23, =FB_WIDTH
	ldr	x24, =FB_HEIGHT
	ldr	x25, =FB_STRIDE
	adr	x26, colours
	ldr	w4, =0xffffffff		/* bit 1, even nibble */
	ldr	w5, =0xffb0b0b0		/* bit 1, odd nibble  */
	ldr	w6, =0xff404040		/* bit 0, even nibble */
	ldr	w7, =0xff202020		/* bit 0, odd nibble  */
	ldr	w8, =0xffff0000		/* red   */
	ldr	w3, =0xff000000	/* opaque black */

	mov	x22, #0			/* y */
row:
	cmp	x22, x24
	b.hs	done
	madd	x9, x22, x25, x21	/* row pointer */
	lsl	x11, x22, #2
	udiv	x11, x11, x24		/* band = y*4/H : 0,1 bars, 2 bits, 3 EL */
	mov	x10, #0			/* x */
col:
	cmp	x10, x23
	b.hs	nextrow
	cmp	x11, #2
	b.lo	bars
	b.eq	bits
el:
	lsl	x12, x10, #2
	udiv	x12, x12, x23		/* block 0..3 */
	cmp	x12, x20
	csel	w13, w8, w3, lo
	b	put
bars:
	lsl	x12, x10, #3
	udiv	x12, x12, x23		/* bar 0..7 */
	ldr	w13, [x26, x12, lsl #2]
	b	put
bits:
	lsl	x12, x10, #6
	udiv	x12, x12, x23		/* bit column 0..63 */
	mov	x14, #63
	sub	x14, x14, x12
	lsr	x15, x19, x14
	tbnz	x12, #2, odd
	tst	x15, #1
	csel	w13, w4, w6, ne
	b	put
odd:
	tst	x15, #1
	csel	w13, w5, w7, ne
put:
	str	w13, [x9, x10, lsl #2]
	add	x10, x10, #1
	b	col
nextrow:
	add	x22, x22, #1
	b	row
done:
	dsb	sy
1:	wfi
	b	1b

	.ltorg
	.balign	4
colours:
	.long	0xffffffff, 0xffffff00, 0xff00ffff, 0xff00ff00
	.long	0xffff00ff, 0xffff0000, 0xff0000ff, 0xff000000

	.balign	16
_end:
