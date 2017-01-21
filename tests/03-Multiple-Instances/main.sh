#!/usr/bin/env bash.origin
eval BO_SELF_BASH_SOURCE="$BO_READ_SELF_BASH_SOURCE"
BO_deriveSelfDir ___TMP___ "$BO_SELF_BASH_SOURCE"
local __BO_DIR__="$___TMP___"


pushd "$__BO_DIR__" > /dev/null

		BO_requireModule "../01-Instance-Functions/module.bo.sh" as "ourInstance1"
		BO_requireModule "../01-Instance-Functions/module.bo.sh" as "ourInstance2"
		BO_requireModule "../01-Instance-Functions/module.bo.sh" as "ourInstance3"

		ourInstance1 set "foo1"
		ourInstance2 set "foo2"
		ourInstance3 set "foo3"

		echo "[1] Value: $(ourInstance1 print)"
		echo "[2] Value: $(ourInstance2 print)"
		echo "[3] Value: $(ourInstance3 print)"

popd > /dev/null
