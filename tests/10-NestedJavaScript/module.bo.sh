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

            var impl = function /*CodeBlock*/ (args) {

                return ("using arg val in sub: " + args.arg);
            }

            var result = CODEBLOCK.run(impl, {
                args: {
                    arg: args.arg1
                }
            });

            console.log("result", result);

            return result;
        }
    }

    echo "CONFIG: $config"

    echo "RESULT: $(CALL_codeblock run_json "${config}")"

}
