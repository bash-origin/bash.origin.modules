#!/usr/bin/env bash.origin.script

if [ "$__ARG1__" != "" ]; then
    single singletonValue="$__ARG1__"
    local instanceValue="$__ARG1__"
    declare -A instanceArray
    instanceArray[1]="$__ARG1__"
else
    single singletonValue
    local instanceValue
    declare -A instanceArray
fi


function EXPORTS_setInstance {
		instanceValue="$1"
    instanceArray[1]="$1"
}

function EXPORTS_setSingleton {
		singletonValue="$1"
}

function EXPORTS_print {
		echo "[${___bo_module_instance_alias___}] __ARG1__: $__ARG1__"
		echo "[${___bo_module_instance_alias___}] singletonValue: $singletonValue"
		echo "[${___bo_module_instance_alias___}] instanceValue: $instanceValue"
		echo "[${___bo_module_instance_alias___}] instanceArray[1]: ${instanceArray[1]}"
}
