/*
 * arm64 Linux Image header (Documentation/arch/arm64/booting.rst).
 * Makes S-Boot treat whatever follows as a kernel. Must be the first 64 bytes.
 * Expects labels `start` (entry code) and `_end` (end of image) in the same section.
 */
	b	start			/* code0: jump over the header */
	.long	0			/* code1 */
	.quad	0			/* text_offset */
	.quad	_end - _head		/* image_size */
	.quad	0xa			/* flags: LE, 4K pages, place anywhere */
	.quad	0			/* res2 */
	.quad	0			/* res3 */
	.quad	0			/* res4 */
	.ascii	"ARM\x64"		/* magic */
	.long	0			/* res5: no PE/COFF header */
