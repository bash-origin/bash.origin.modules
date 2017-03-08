#!/usr/bin/env bash.origin.script

depend {
    "codeblock": "@com.github/0ink/codeblock.js#s1"
}

function EXPORTS_run {

    local config={
        "args": {
            "arg1": "val1"
        },
        "impl": function /* CodeBlock */ (args) {

            console.log("ARGS:", args);

            return ("using arg val: " + args.arg1);
        }
    }

    echo "CONFIG: $config"

    echo "RESULT: $(CALL_codeblock run_json "${config}")"

}
