#!/usr/bin/env bash.origin.script

pushd "$__BO_DIR__" > /dev/null

	BO_requireModule "./module.bo.sh" as "ourInstance"

	ourInstance setJSON "bar"
	ourInstance print

	ourInstance passJSON {
		"nastyString": "_\$1_\$h_-_'_\"_#_(_)_{_}_^_",
	#	        "commented": "out",
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
	ourInstance print

	ourInstance passJSON {
		"key": "val"
	} --extra arg
	ourInstance print

popd > /dev/null
