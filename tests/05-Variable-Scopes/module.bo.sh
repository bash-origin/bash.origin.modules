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

local global1="global1value"
local global2="global2value"

function EXPORTS_setInstance {
    instanceValue="$1"
    instanceArray[1]="$1"
}

function EXPORTS_setSingleton {
    singletonValue="$1"
}

function EXPORTS_print {
    echo "[${___bo_module_instance_alias___}] global1: $global1"
    echo "[${___bo_module_instance_alias___}] global1: $(BO_run_recent_node --eval '
        process.stdout.write("'$global1'");
    ')"
    echo "[${___bo_module_instance_alias___}] global2: ${global2}"
    echo $(BO_run_recent_node --eval '
        process.stdout.write("[${___bo_module_instance_alias___}] global2: '${global2}'");
    ')    
    echo "[${___bo_module_instance_alias___}] __ARG1__: $__ARG1__"
    echo "[${___bo_module_instance_alias___}] singletonValue: $singletonValue"
    echo "[${___bo_module_instance_alias___}] instanceValue: $instanceValue"
    echo "[${___bo_module_instance_alias___}] instanceArray[1]: ${instanceArray[1]}"
}
