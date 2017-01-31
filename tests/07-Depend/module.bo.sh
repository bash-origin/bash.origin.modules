#!/usr/bin/env bash.origin.script

depend {
    "cli": "@com.github/bash-origin/bash.origin.cli#1"
}

function EXPORTS_run {

		echo "__DEPEND__: ${__DEPEND__}"

		echo "Running 'cli fingerprint': $(CALL_cli fingerprint --os)"
}
