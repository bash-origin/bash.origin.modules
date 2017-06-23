#!/usr/bin/env bash.origin.script


function EXPORTS_validate {
    echo "$(BO_run_recent_node --eval '
        console.log(JSON.stringify(JSON.parse(process.argv[1]), null, 4));
    ' "$1")"
}

echo "[2]__CALLER_DIRNAME__: $__CALLER_DIRNAME__"

function EXPORTS_run {

    echo "[2]__CALLER_DIRNAME__: $__CALLER_DIRNAME__"

    echo "[2]__ARGS__: ${__ARGS__}"
    echo "[2]__ARGS__: $(EXPORTS_validate "${__ARGS__}")"

    echo "[2]__ARG1__: ${__ARG1__}"
    echo "[2]__ARG1__: $(EXPORTS_validate "${__ARG1__}")"

    echo "[2] Args: $@"
    echo "[2] Args: $(EXPORTS_validate "${@}")"

    echo "[2] Arg1: $1"
    echo "[2] Arg1: $(EXPORTS_validate "${1}")"
}
