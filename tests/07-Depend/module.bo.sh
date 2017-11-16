#!/usr/bin/env bash.origin.script

depend {
    "cli": "@com.github/bash-origin/bash.origin.cli#1"
}

# NOTE: __CALLER_DIRNAME__ will not be set because we are not being called via a bash.origin.script
# TODO: Fix
# @see https://github.com/bash-origin/bash.origin/issues/8
#echo "__CALLER_DIRNAME__: $__CALLER_DIRNAME__"
echo "__CALLER_DIRNAME__: "

function EXPORTS_run {

		echo "__DEPEND__: ${__DEPEND__}"
    # NOTE: __CALLER_DIRNAME__ will not be set because we are not being called via a bash.origin.script
    # TODO: Fix
    # @see https://github.com/bash-origin/bash.origin/issues/8
    #echo "__CALLER_DIRNAME__: $__CALLER_DIRNAME__"
    echo "__CALLER_DIRNAME__: "

    # TODO: Allow for OS-dependant test variations.
    echo "TEST_MATCH_IGNORE>>>"

		echo "Running 'cli fingerprint': $(CALL_cli fingerprint --os)"

    echo "<<<TEST_MATCH_IGNORE"

}
