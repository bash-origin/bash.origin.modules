#!/usr/bin/env bash.origin.script

echo "__ARGS__: $__ARGS__"
echo "__ARG1__: $__ARG1__"
echo "__ARG2__: ${__ARG2_}_"

local arg1="$__ARG1__"

function EXPORTS_print {
		echo "[${___bo_module_instance_alias___}] 1: $1"
		echo "[${___bo_module_instance_alias___}] __ARGS__: $__ARGS__"
		echo "[${___bo_module_instance_alias___}] __ARG1__: $__ARG1__"
		echo "[${___bo_module_instance_alias___}] arg1: $arg1"
		echo "[${___bo_module_instance_alias___}] __ARG2__: ${__ARG2__}"
}
