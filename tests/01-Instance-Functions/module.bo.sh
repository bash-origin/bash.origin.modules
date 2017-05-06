#!/usr/bin/env bash.origin.script

local value

function EXPORTS_set {
	value="$1"
}

function EXPORTS_print {
	EXPORTS_print2
}

function EXPORTS_print2 {
	INTERNAL_print
}

function INTERNAL_print {
	echo "$value"
}
