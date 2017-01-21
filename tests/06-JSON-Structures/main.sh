#!/usr/bin/env bash.origin
eval BO_SELF_BASH_SOURCE="$BO_READ_SELF_BASH_SOURCE"
BO_deriveSelfDir ___TMP___ "$BO_SELF_BASH_SOURCE"
local __BO_DIR__="$___TMP___"


pushd "$__BO_DIR__" > /dev/null

		BO_requireModule "./module.bo.sh" as "ourInstance"

		ourInstance setPureJSON "bar"
		ourInstance print

popd > /dev/null
