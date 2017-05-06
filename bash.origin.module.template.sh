#!/bin/bash -ue
# Source https://github.com/cadorn/bash.origin
# Source https://github.com/bash-origin/bash.origin
if [ -z "${BO_LOADED}" ]; then
    if [ ! -z "$BO_ROOT_SCRIPT_PATH" ]; then
        [ -z "$BO_VERBOSE" ] || echo "[bash.origin.module][compiled:%%%___FILENAME___%%%] Sourcing '${BO_ROOT_SCRIPT_PATH}'"
        . "${BO_ROOT_SCRIPT_PATH}"
    else
        [ -z "$BO_VERBOSE" ] || echo "[bash.origin.module][compiled:%%%___FILENAME___%%%] Sourcing '${HOME}/.bash.origin'"
        . "${HOME}/.bash.origin"
    fi
fi
function init {
    eval BO_SELF_BASH_SOURCE="$BO_READ_SELF_BASH_SOURCE"
    BO_deriveSelfDir ___TMP___ "$BO_SELF_BASH_SOURCE"
    local __BO_DIR__="$___TMP___"

    function as {

        # This 'uid' is derived from all runtime variables that together form
        # a specific run and this build context. If this 'uid' changes at runtime
        # as opposed to what is stored here, the module will be re-built.
        local ___bo_module_rt_context_uid___="%%%___RT_CONTEXT_UID___%%%"

        local ___bo_module_rt_caller_pwd___="$(pwd)"

        local ___bo_module_instance_alias___="$1"
        shift
        local ___bo_module_instance_args___="$@"
        # TODO: Do this dynamically
        local ___bo_module_instance_arg1___="$1"
        local ___bo_module_instance_arg2___="$2"

source <(echo '

function '${___bo_module_instance_alias___}' {
    local func="'${___bo_module_instance_alias___}'__EXPORTS_$1"
    [ -z "\$BO_VERBOSE" ] || BO_log "\$BO_VERBOSE" "[bash.origin.module][compiled:%%%___FILENAME___%%%] Call function '"'"'\${func}'"'"'"
    shift
    export '${___bo_module_instance_alias___}'__CALLER_DIRNAME__="$___bo_module_instance_caller_dirname___"
    "$func" "$@"
    rc=$?
    [ -z "\$BO_VERBOSE" ] || BO_log "\$BO_VERBOSE" "[bash.origin.module][compiled:%%%___FILENAME___%%%] Done calling function '"'"'\${func}'"'"'"
    return $rc
}

%%%___MODULE_INIT_CODE___%%%

%%%___COMPILED_MODULE_SOURCE___%%%

')

    }
}
init "$@"
