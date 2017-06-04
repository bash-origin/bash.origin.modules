#!/usr/bin/env bash.origin.script

local json

function EXPORTS_setJSON {
    json={
        "arg1": "$1",
        "nastyString": "_\$1_\$h_-_'_\"_#_(_)_{_}_^_",
#        "commented": "out",
    		"level-1-key": {
    				"level-2-key": {
    						"string": "foo",
    						"boolean": true,
    						"integer": 1,
    						"float": 0.1,
    						"null": null
    				}
    		}
    }

    # NOTE: The following ensures that JSON blocks in multi-line strings
    #       do not get parsed.
    BO_run_node --eval '
        var foo = {
            key: "val"
        }
        console.log("FOO:", foo);
        console.log("FOO.key:", foo[\'key\']);
    '

#    {
#        "commented": "out"
#    }
}

function EXPORTS_passJSON {
    echo "[passJSON] args: $@"
    echo "[passJSON] arg1: $1"
    echo "[passJSON] arg2: $2"
    echo "[passJSON] arg3: $3"
    json="$1"
}

function EXPORTS_print {
    echo "[json]: $json"
}
