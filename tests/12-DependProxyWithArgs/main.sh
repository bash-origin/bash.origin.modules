#!/usr/bin/env bash.origin.script

depend {
    "mod": {
		"./module.bo.sh": {
			"init": {
				"string": "value",
				"array": [
					"item"
				],
				"integer": 1,
				"boolean": true,
				"null": null
			}
		}
	}
}

echo "[0]__DEPEND__: ${__DEPEND__}"
echo "[0]__DEPEND__: $(CALL_mod validate "${__DEPEND__}")"

CALL_mod run {
	"func": {
		"string": "value",
		"array": [
			"item"
		],
		"integer": 1,
		"boolean": true,
		"null": null
	}
}
