#!/usr/bin/env bash.origin
eval BO_SELF_BASH_SOURCE="$BO_READ_SELF_BASH_SOURCE"
BO_deriveSelfDir ___TMP___ "$BO_SELF_BASH_SOURCE"
local __BO_DIR__="$___TMP___"


pushd "$__BO_DIR__" > /dev/null

		BO_requireModule "./module.bo.sh" as "ourInstance1"
		ourInstance1 print

		BO_requireModule "./module.bo.sh" as "ourInstance2" "default-2-val"

		echo "--"

		ourInstance1 print
		ourInstance1 setInstance "instance-1-val"
		ourInstance1 setSingleton "instance-1-val"
		ourInstance1 print

		echo "--"

		ourInstance2 print
		ourInstance2 setInstance "instance-2-val"
		ourInstance2 setSingleton "instance-2-val"
		ourInstance2 print

		echo "--"

		ourInstance1 print

popd > /dev/null
