#!/usr/bin/env bash.origin.script

depend {
    "impl": {
		"../impl.bo.sh": ${__ARG1__}
	}
}


function EXPORTS_validate {
    CALL_impl validate $@
}

echo "[1]__CALLER_DIRNAME__: $__CALLER_DIRNAME__"

echo "[1]__DEPEND__: ${__DEPEND__}"
echo "[1]__DEPEND__: $(CALL_impl validate "${__DEPEND__}")"


function EXPORTS_run {

    PROXY_impl run $@
}
