/* Position-independent flat image; S-Boot chooses the load address. */
ENTRY(_head)
SECTIONS
{
	. = 0;
	.text : { *(.text) }
	/DISCARD/ : { *(.note*) *(.comment) }
}
