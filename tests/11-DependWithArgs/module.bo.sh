#!/usr/bin/env bash.origin.script


function EXPORTS_validate {
    echo "$(BO_run_recent_node --eval '
        console.log(JSON.stringify(JSON.parse(process.argv[1]), null, 4));
    ' "$1")"
}

echo "__CALLER_DIRNAME__: $__CALLER_DIRNAME__"

function EXPORTS_run {

    echo "__CALLER_DIRNAME__: $__CALLER_DIRNAME__"

    echo "__ARGS__: ${__ARGS__}"
    echo "__ARGS__: $(EXPORTS_validate "${__ARGS__}")"

    echo "__ARG1__: ${__ARG1__}"
    echo "__ARG1__: $(EXPORTS_validate "${__ARG1__}")"

    echo "Args: $@"
    echo "Args: $(EXPORTS_validate "${@}")"

    echo "Arg1: $1"
    echo "Arg1: $(EXPORTS_validate "${1}")"
}
