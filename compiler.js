
const Promise = require("bluebird");
const MINIMIST = require("minimist");
const PATH = require("path");
const FS = require("fs-extra");
const UUID_V4 = require("uuid/v4");
const CRYPTO = require("crypto");
const CODEBLOCK = require("codeblock");
const ESCAPE_REGEXP = require("escape-regexp");
const LIB_JSON = require("lib.json");

Promise.promisifyAll(FS);
FS.existsAsync = function (path) {
    return new Promise(function (resolve) {
        return FS.exists(path, resolve);
    });
};

const VERBOSE = !!process.env.BO_VERBOSE || false;

const templateFilePath = PATH.join(__dirname, "bash.origin.module.template.sh");


exports.compile = async function (sourceCode, sourceFilePath) {

    const templateSourceCode = await FS.readFileAsync(templateFilePath, "utf8");

    var compiledModuleCode = templateSourceCode;

    var buildUUID = UUID_V4();

    var moduleImplementationUUID = CRYPTO.createHash('sha1').update(
        process.env.BO_WORKSPACE_ROOT ?
            PATH.relative(process.env.BO_WORKSPACE_ROOT, sourceFilePath) :
            sourceFilePath
    ).digest('hex');
    var singletonNamespacePrefix = "___bo_module_singleton_ns_" + moduleImplementationUUID + "___";


    var compiledSourceCode = sourceCode;

    // Remove shebang
    compiledSourceCode = compiledSourceCode.replace(/^#!.*$/m, "");


    // Serialize JSON
    var lines = compiledSourceCode.split("\n");
    var re = /^(\s*)(\S.+)\{$/;
    var m = null;
    var buffer = null;
    var startIndent = null;
    var endRe = null;
    var startBuffer = null;
    var skipSection = null;
    lines = lines.map(function (line) {

        // Skip commented out lines starting with '#' or '//'
        if (/^[\s\t]*(#[^\!]|\/\/)/.test(line)) {
            if (VERBOSE) console.log("Ignore line:", line);
            return "";
        }

        if (!endRe) {

            if (!skipSection) {
                // TODO: Make this more generic.
                if (/--eval '$/.test(line)) {
                    skipSection = {
                        lookFor: /^\s*'\s*/
                    }
                }
            } else {
                if (skipSection.lookFor.test(line)) {
                    skipSection = null;
                    return line;
                }
            }
            if (skipSection) {
                return line;
            }

            // Find starting bracket.
            if (
                (m = line.match(re)) &&
                !/^function\s/.test(m[2])
            ) {
                buffer = [
                    "{"
                ];
                startIndent = m[1];
                endRe = new RegExp("^" + ESCAPE_REGEXP(startIndent) + "\\}(\\s.*)?$");
                startBuffer = line.replace(/\{$/, "");
                return null;
            }
            return line;
        }

        // Find closing bracket.
        if ( (m = line.match(endRe)) ) {
            buffer.push("}");
            var ret = startBuffer;
            try {
                buffer = buffer.join("\n")
                    // Escape '\$'
                    .replace(/\\\$/g, '\\\\$');

                if (VERBOSE) console.log("Raw JSON section:", buffer);

                buffer = buffer.replace(/: (\$\{?[^,\}\n]+?\}?)(,?)$/m, ': "__UNQUOTE__$1__UNQUOTE__"$2');

                if (VERBOSE) console.log("Parsing JSON section:", buffer);

                var purified = CODEBLOCK.purifyCode(buffer, {
                    freezeToJSON: true
                });

                if (process.env.DEBUG) {
                    console.error("[bash.origin.modules:compile] purified >>>");
                    process.stderr.write(purified + "\n");
                    console.error("<<< [bash.origin.modules:compile]");
                }

                ret += '"'
                    + JSON.stringify(JSON.parse(purified))
                    // Reverse '__UNQUOTE__$__UNQUOTE__'
                    .replace(/("__UNQUOTE__|__UNQUOTE__")/g, '')
                    // Escape "`"
                    .replace(/`/g, '&#96;')
                    // Escape all backslashes as we are wrapping again
                    .replace(/\\/g, '\\\\')
                    // Escape all quotes as we are wrapping again
                    .replace(/"/g, '\\"')
                    // Cleanup escaping for all '\$' variables as they should not be replaced in the bash layer.
                    .replace(/([^\\])\\\\\\\\\$/g, '$1\\\$')
                    // Cleanup escaping for all '\\\$' variables as they should not be replaced in the bash layer.
                    .replace(/([^\\])\\\\\\\\\\\\\\\\\$/g, '$1\\\\\\\\\\$')

                    // '"\\n\\\"' -> '"\\\\\n\\\"'
                    .replace(/"(\\\\n\\\\\\)"/g, '"\\\\\\$1"')

// NOTE: Old rules that have been fixed above as boundaries were reviewed.
                    // Escape JSON '"' as we are wrapping in '"'
//                        .replace(/"/g, '\\"')
                    // The following are used to escape regular expressions used in the JSON/codeblocks.
                    // TODO: Make these more generic by using better parsers.
                    // TODO: Add tests for all these. Currently being tested by dependent modules.
                    // Escape '\?'
//                        .replace(/\\\?/g, '\\\\?')
                    // Escape '\"'
//                        .replace(/\\\\"/g, '\\\\\\"')
                    // Escape '\$' which is now '\\$'
//                        .replace(/\\\\\$/g, "\\\\\\\$")
                    + '"';

            } catch (err) {
                process.stderr.write("purified: " + purified +"\n");
                console.error("ERROR: " + err.message + " while parsing JSON:", buffer, err.stack);
                throw err;
                //ret += buffer;
            }
            if (m[1]) {
                ret += " " + m[1];
            }
            buffer = null;
            startIndent = null;
            endRe = null;
            startBuffer = null;
            return ret;
        }
        buffer.push(line);
        return null;
    }).filter(function (line) {
        return (line !== null);
    });
    compiledSourceCode = lines.join("\n");


    // Escape variables
    // TODO: Use proper AST transform for bash code like https://github.com/vorpaljs/bash-parser

    // Quote all /'/ so that they will not interfere with 'source <(echo ' in template at runtime.
    compiledSourceCode = compiledSourceCode.replace(/'/g, "'\"'\"'");
    // Also fix with ''"'"''
    compiledSourceCode = compiledSourceCode.replace(/\\'"'"'/g, "''\"'\"''");

    // Elevate instance variable in layer so it is frozen when module constructed.
    compiledSourceCode = compiledSourceCode.replace(/(\$\{___bo_module_instance_alias___\})/g, "'$1'");


    // Prefix variables
    var variables = {};
    var re = /^\s*(single|declare(?: [-\w]+)?|local|depend) (?:(".+?"\n)|([^\n=]+)[ ;=])?([^\n]*)$/mg;
    var match = null;

    while ( (match = re.exec(compiledSourceCode)) ) {

        if (/^(single$|declare )/.test(match[1])) {
            match[2] = match[4];
            match[4] = (void 0);
        } else {
            if (!match[2]) {
                match[2] = match[3];
                match[3] = (void 0);
            }
        }

        if (VERBOSE) console.log("match:", match);

        if (
            !variables[match[2]] ||
            (
                typeof variables[match[2]].value === "undefined" &&
                typeof match[3] !== "undefined"
            )
        ) {
            variables[match[2]] = {
                "match": match[0],
                "scope": match[1],
                "name": match[2],
                "value": match[3]
            };
        }
        compiledSourceCode = compiledSourceCode.replace(
            new RegExp(ESCAPE_REGEXP(match[0]), "g"),
            match[0].replace(/^(\s*)local/, "$1export")
        );
    }

    if (VERBOSE) console.log("variables:", variables);

    await Promise.mapSeries(Object.keys(variables), async function (variableName) {
        if (VERBOSE) console.log("Prefixing variable '" + variableName + "' for module '" + sourceFilePath + "'");

        var replacement = "$1'${___bo_module_instance_alias___}'__" + variableName + "$2";

        if (variables[variableName].scope === "depend") {

            var dependDeclarations = null;
            try {

                variables[variableName].name = variables[variableName].name.replace(/\$\{([^\}]+)\}/g, '\\"___VaRsTaRt___$1___VaReNd___\\"');

                dependDeclarations = JSON.parse(JSON.parse(variables[variableName].name));
            } catch (err) {
                console.error("JSON:", variables[variableName].name);
                err.message += " (while parsing 'depend' from file '" + sourceFilePath + "')";
                err.stack += "\n(while parsing 'depend' from file '" + sourceFilePath + "')";
                throw err;
            }

            if (VERBOSE) console.log("dependDeclarations:", dependDeclarations);

            // Resolve declarations
            await Promise.all(Object.keys(dependDeclarations).map(async function (alias) {
                let uri = dependDeclarations[alias];

// console.error("uri", alias, uri);

                async function resolveUri (uri) {
                    // For now we only resolve pinf.it compatible URIs here and leave the rest to bash.origin.
                    const uriMatch = uri.match(/^([^@#\s]+)\s*#\s*([^\s]+)$/);

                    if (!uriMatch) {
                        return null;
                    }

                    const lookups = {};
                    // No assumptions interface.
                    const noAssumptionLookup = `#!/gi0.BashOrigin.org/#!_${uriMatch[2].replace(/\//g, '_')}.sh`;
                    lookups[noAssumptionLookup] = '#!/gi0.BashOrigin.org/#!';
                    const doc = await LIB_JSON.docFromFilepathsInOwnAndParent(PATH.dirname(sourceFilePath), lookups, {
                        lookupDirs: [
                            '',
                            'node_modules'
                        ]
                    });
                    if (
                        doc &&
                        doc[lookups[noAssumptionLookup]] &&
                        doc[lookups[noAssumptionLookup]][uriMatch[1]]
                    ) {
                        dependDeclarations[alias] = PATH.join(sourceFilePath, '..', doc[lookups[noAssumptionLookup]][uriMatch[1]]);
                    } else {
                        // TODO: Use colored error logger so message stands out.
                        console.error('noAssumptionLookup:', noAssumptionLookup);
                        console.error('doc:', doc);
                        throw new Error(`Cannot resolve package uri '${uriMatch[1]}' to path! Used in '${sourceFilePath}'.`);
                    }
                }

                if (
                    uri &&
                    typeof uri === 'object'
                ) {
                    const key = Object.keys(uri)[0];

// console.log("RESOLVE", key);
                    const resolvedUri = await resolveUri(key);

// console.log("RESOLVE RESULT", resolvedUri);
                    if (resolvedUri) {
                        const obj = {};
                        obj[resolvedUri] = uri[key];
// console.log("BEFORE", dependDeclarations);
                        dependDeclarations[alias] = obj;
// console.log("ASFTER", dependDeclarations);
                    }

                } else
                if (
                    uri &&
                    typeof uri === 'string'
                ) {
                    const resolvedUri = await resolveUri(uri);
                    if (resolvedUri) {
                        dependDeclarations[alias] = resolvedUri;
                    }
                }
            }));

            function reheatConfigVariables (configString) {

                configString = configString.replace(/"___VaRsTaRt___(.+?)___VaReNd___"/g, "\${$1}");

                if (/^\$\{([^\}]+)\}$/.test(configString)) {
                    configString = "'" + configString + "'";
                }

                return configString;
            }

            compiledSourceCode = compiledSourceCode.replace(
                new RegExp("^" + ESCAPE_REGEXP(variables[variableName].match) + "$", "gm"),
                [
                    "'${___bo_module_instance_alias___}'__DEPEND=\"" + reheatConfigVariables(JSON.stringify(dependDeclarations)).replace(/"/g, '\\"') + "\""
                ].concat(
                    Object.keys(dependDeclarations).map(function (alias) {
                        var uri = dependDeclarations[alias];
                        var config = {};
                        if (typeof uri !== "string") {
                            uri = Object.keys(dependDeclarations[alias])[0];
                            config = dependDeclarations[alias][uri];
                        }
                        if (/^\./.test(uri)) {
                            uri = PATH.join(PATH.dirname(sourceFilePath), uri);
                        } else
                        if (/^@\./.test(uri)) {
                            uri = "@" + PATH.dirname(sourceFilePath) + "/" + uri.replace(/^@/, "");
                        }
                        return [
                            'function CALL_' + alias + ' {',
                            '    export ___bo_module_instance_caller_dirname___="' + PATH.dirname(sourceFilePath) + '"',
                            '    CALL_IMPL_' + alias + ' "$@"',
                            '}',
                            'function PROXY_' + alias + ' {',
                            // NOTE: When we 'proxy' we *hide* ourselves from the module being called.
                            '    CALL_IMPL_' + alias + ' "$@"',
                            '}',
                            'export ___bo_module_instance_caller_dirname___="' + PATH.dirname(sourceFilePath) + '"',
                            'BO_requireModule "' + uri + '" as "CALL_IMPL_' + alias + '" "' + reheatConfigVariables(JSON.stringify(config)).replace(/"/g, '\\\\\\"') + '"',
                            'export ___bo_module_instance_caller_dirname___='
                        ].join("\n");
                    })
                ).join("\n")
            );

            replacement = null;

        } else
        if (variables[variableName].scope === "single") {

            // Remove non-initializing singleton declaration.
            // We do not need to declare it in bash.
            compiledSourceCode = compiledSourceCode.replace(
                new RegExp("^" + ESCAPE_REGEXP(variables[variableName].match.replace(/=.*$/, "")) + " *$", "gm"),
                "#" + variables[variableName].match.replace(/=.*$/, "")
            );

            if (typeof variables[variableName].value !== "undefined") {
                // TODO: Fix prefixing of variables with value assignment.
                compiledSourceCode = compiledSourceCode.replace(
                    new RegExp("^" + ESCAPE_REGEXP(variables[variableName].match) + "\\s*$", "gm"),
                    variables[variableName].match.replace(/^(\s*)single\s+/, "$1")
                );
            }
            replacement = "$1" + singletonNamespacePrefix + "__" + variableName + "$2";
        }

        if (replacement !== null) {

            if (VERBOSE) console.log("Replace", variableName, "with", replacement);

            compiledSourceCode = compiledSourceCode.replace(
                new RegExp("(^[\\s\\t]+|^[\\s\\t]*(?:export|local)\\s|[\\$\\{])" + ESCAPE_REGEXP(variableName) + "([\\s\\}=\\[\\]\"'])", "mg"),
                replacement
            );
        }
    });


    // Prefix module functions
    // TODO: Use proper AST transform for bash code like https://github.com/vorpaljs/bash-parser
    // TODO: Optionally inject tracing code.
    var functionNames = [];
    var re = /^(\s*function\s+)([\w\d_]+)(\s*\{\s*)$/mg;
    var match = null;
    while ( (match = re.exec(compiledSourceCode)) ) {
        functionNames.push(match[2]);
    }
    // Sort names so that the longest ones are first
    functionNames.sort(function (a, b) {
        if (a.length > b.length) return -1;
        if (a.length < b.length) return 1;
        if (a > b) return 1;
        if (a < b) return -1;
        return 0;
    });
    functionNames.forEach(function (functionName) {
        if (VERBOSE) console.log("Prefixing function '" + functionName + "' for module '" + sourceFilePath + "'");
        compiledSourceCode = compiledSourceCode.replace(
            new RegExp("([\\s`!\\(\"'])" + ESCAPE_REGEXP(functionName) + "([\\s\\{;\\)\"'])", "g"),
            "$1'${___bo_module_instance_alias___}'__" + functionName + "$2"
        );
    });


    var moduleInitCode = [];

    var dirname = PATH.dirname(sourceFilePath);
    var rtDirname = PATH.basename(dirname).replace(/^.+~([^~]+)$/, "$1");

    // If '__RT_DIRNAME__' variable is needed (found in code) we make sure the directory exists
    if (/__RT_DIRNAME__/.test(compiledSourceCode)) {
        moduleInitCode = moduleInitCode.concat([
            'if [ ! -e "\'${___bo_module_rt_caller_pwd___}\'/.~rt/' + rtDirname + '" ]; then',
                'set +e',
                'mkdir -p "\'${___bo_module_rt_caller_pwd___}\'/.~rt/' + rtDirname + '" || true',
                'set -e',
            'fi'
        ]);
    }

    // Replace bash.origin modules reserved environment variables
    compiledSourceCode = compiledSourceCode.replace(/(?<!\\)\$\{?__FILENAME__\}?/g, sourceFilePath);
    compiledSourceCode = compiledSourceCode.replace(/(?<!\\)\$\{?__BASENAME__\}?/g, PATH.basename(sourceFilePath));
    compiledSourceCode = compiledSourceCode.replace(/(?<!\\)\$\{?__DIRNAME__\}?/g, dirname);
    compiledSourceCode = compiledSourceCode.replace(/\$\{?__RT_DIRNAME__\}?/g, "'${___bo_module_rt_caller_pwd___}'/.~rt/" + rtDirname);
    compiledSourceCode = compiledSourceCode.replace(/\$\{?__BUILD_UUID__\}?/g, buildUUID);
    compiledSourceCode = compiledSourceCode.replace(/\$\{?__IMPL_HASH__\}?/g, moduleImplementationUUID);
    compiledSourceCode = compiledSourceCode.replace(/\$\{?__IMPL_HASH7__\}?/g, moduleImplementationUUID.substring(0, 7));
    compiledSourceCode = compiledSourceCode.replace(/\$\{?__ARGS__\}?/g, "'${___bo_module_instance_args___}'");
    compiledSourceCode = compiledSourceCode.replace(/\$\{?__ARG1__\}?/g, "'${___bo_module_instance_arg1___}'");
    compiledSourceCode = compiledSourceCode.replace(/\$\{?__ARG2__\}?/g, "'${___bo_module_instance_arg2___}'");
    compiledSourceCode = compiledSourceCode.replace(/\$\{?__DEPEND__\}?/g, "${'${___bo_module_instance_alias___}'__DEPEND}");
    compiledSourceCode = compiledSourceCode.replace(/\$\{?__INSTANCE_ALIAS__\}?/g, "'${___bo_module_instance_alias___}'");
    compiledSourceCode = compiledSourceCode.replace(/\$\{?__CALLER_DIRNAME__\}?/g, "${'${___bo_module_instance_alias___}'__CALLER_DIRNAME__}");

    // Fix variables that are nested too deeply
    // '"'"''${___bo_module_instance_arg1___}''"'"' -> '${___bo_module_instance_arg1___}'
    compiledSourceCode = compiledSourceCode.replace(/'"'"''\$\{[^\}]+\}''"'"'/g, "'$1'");


    // TODO: Adjust indenting properly using sourcemint helper
    compiledModuleCode = compiledModuleCode.replace(/%%%___MODULE_INIT_CODE___%%%/g, moduleInitCode.join("\n"));
    compiledModuleCode = compiledModuleCode.split("%%%___COMPILED_MODULE_SOURCE___%%%");
    compiledModuleCode.splice(1, 0, compiledSourceCode);
    compiledModuleCode = compiledModuleCode.join("");

    // Replace bash.origin modules variables
    compiledModuleCode = compiledModuleCode.replace(/%%%___FILENAME___%%%/g, sourceFilePath);
    compiledModuleCode = compiledModuleCode.replace(/%%%__BASENAME__%%%/g, PATH.basename(sourceFilePath));
    compiledModuleCode = compiledModuleCode.replace(/%%%___DIRNAME___%%%/g, dirname);
    compiledModuleCode = compiledModuleCode.replace(/%%%__RT_DIRNAME__%%%/g, "'${___bo_module_rt_caller_pwd___}'/.~rt/" + rtDirname);
    compiledModuleCode = compiledModuleCode.replace(/%%%___BUILD_UUID___%%%/g, buildUUID);

    var rtContextUID = CRYPTO.createHash('sha1').update(
        [
            sourceFilePath,
            // TODO: Also derive context UID based on features used in module file.
            //       e.g. If NodeJS is involved, include the major version so that
            //       binary modules get re-compiled when it changes.
            "fake-context-id"                
        ].join(":")
    ).digest('hex');
    compiledModuleCode = compiledModuleCode.replace(/%%%___RT_CONTEXT_UID___%%%/g, rtContextUID);

    if (VERBOSE) console.log("compiledModuleCode:", compiledModuleCode);

    return compiledModuleCode;
}

exports.compileFile = function (sourceFilePath, targetFilePath) {

    return FS.realpathAsync(sourceFilePath).then(function (sourceFilePath) {

        return FS.readFileAsync(sourceFilePath, "utf8").then(function (sourceCode) {

            return exports.compile(sourceCode, sourceFilePath);
        });
    }).then(function (compiledModuleCode) {

        return FS.outputFileAsync(targetFilePath, compiledModuleCode, "utf8");
    });
}


exports.main = function () {
    return Promise.try(function () {

        var args = MINIMIST(process.argv.slice(2));

        var sourceFilePath = args._.shift();
        var targetFilePath = args._.shift();

        return exports.compileFile(sourceFilePath, targetFilePath);
    });
}


if (require.main === module) {
    exports.main().then(function () {
        // NOTE: We do not explicitly exit!
        return null;
    }).catch(function (err) {
        console.error("ERROR:", err.stack || err);
        process.exit(1);
    });
}
