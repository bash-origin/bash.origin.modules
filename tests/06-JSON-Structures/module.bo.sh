#!/usr/bin/env bash.origin.script

local pureJSON

function EXPORTS_setPureJSON {
    pureJSON={
        "arg1": "$1",
        "nastyString": "_\$1_\$h_-_'_\"_#_(_)_{_}_^_",
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
}

function EXPORTS_print {
		echo "[pure-json]: $pureJSON"
}
