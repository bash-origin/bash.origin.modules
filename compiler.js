
const Promise = require("bluebird");
const MINIMIST = require("minimist");
const REGEXP_ESCAPE = require("escape-string-regexp");
const PATH = require("path");
const FS = require("fs-extra");
const UUID_V4 = require("uuid/v4");
const CRYPTO = require("crypto");
Promise.promisifyAll(FS);
FS.existsAsync = function (path) {
    return new Promise(function (resolve) {
        return FS.exists(path, resolve);
    });
};

const VERBOSE = !!process.env.VERBOSE || false;


exports.main = function () {
    return Promise.try(function () {

        var args = MINIMIST(process.argv.slice(2));

        var templateFilePath = PATH.join(__dirname, "bash.origin.module.template.sh");
        var sourceFilePath = args._.shift();
        var targetFilePath = args._.shift();

        return FS.readFileAsync(templateFilePath, "utf8").then(function (templateSourceCode) {

            var compiledModuleCode = templateSourceCode;

            return FS.realpathAsync(sourceFilePath).then(function (absoluteSourceFilePath) {

                return FS.readFileAsync(sourceFilePath, "utf8").then(function (sourceCode) {

                    var buildUUID = UUID_V4();
                    var moduleImplementationUUID = CRYPTO.createHash('sha1').update(sourceFilePath).digest('hex');
                    var singletonNamespacePrefix = "___bo_module_singleton_ns_" + moduleImplementationUUID + "___";


                    var compiledSourceCode = sourceCode;

                    // Remove shebang
                    compiledSourceCode = compiledSourceCode.replace(/^#!.*\n/m, "");



                    // Serialize JSON
                    var lines = compiledSourceCode.split("\n");
                    var re = /^(\s*)(\S.+)\{$/;
                    var m = null;
                    var buffer = null;
                    var startIndent = null;
                    var endRe = null;
                    var startBuffer = null;
                    lines = lines.map(function (line) {

                        if (!endRe) {
                            // Find starting bracket.
                            if (
                                (m = line.match(re)) &&
                                !/^function\s/.test(m[2])
                            ) {
                                buffer = [
                                    "{"
                                ];
                                startIndent = m[1];
                                endRe = new RegExp("^" + REGEXP_ESCAPE(startIndent) + "\\}(\s\\S.*)?$");
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
                                ret += '"'
                                    + JSON.stringify(JSON.parse(buffer))
                                    // Escape JSON '"' as we are wrapping in '"'
                                    .replace(/"/g, '\\"')
                                    // Escape '\"'
                                    .replace(/\\\\"/g, '\\\\\\"')
                                    // Escape '\$' which is now '\\$'
                                    .replace(/\\\\\$/g, "\\\\\\\$")
                                    + '"';
                            } catch (err) {
                                console.error("ERROR: " + err.message + " while parsing JSON:", buffer, err.stack);
                                throw err;
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

                    // Elevate instance variable in layer so it is frozen when module constructed.
                    compiledSourceCode = compiledSourceCode.replace(/(\$\{___bo_module_instance_alias___\})/g, "'$1'");



                    // Prefix variables
                    var variables = {};
                    var re = /^\s*(single|declare(?:\s[-\w]+)?|local)\s(?:(.+)[\s;=])?(.*)$/mg;
                    var match = null;
                    while ( (match = re.exec(compiledSourceCode)) ) {
                        variables[match[2]] = {
                            "match": match[0],
                            "scope": match[1],
                            "name": match[2],
                            "value": match[3]
                        }
                        compiledSourceCode = compiledSourceCode.replace(
                            new RegExp(REGEXP_ESCAPE(match[0]), "g"),
                            match[0].replace(/^(\s*)local/, "$1export")
                        );
                    }
                    Object.keys(variables).forEach(function (variableName) {
                        if (VERBOSE) console.log("Prefixing variable '" + variableName + "' for module '" + sourceFilePath + "'");

                        var replacement = "$1'${___bo_module_instance_alias___}'__" + variableName + "$2";

                        if (variables[variableName].scope === "single") {

                            if (typeof variables[variableName].value !== "undefined") {
                                // TODO: Fix prefixing of variables with value assignment.
                                compiledSourceCode = compiledSourceCode.replace(
                                    new RegExp("^" + REGEXP_ESCAPE(variables[variableName].match) + "\\s*$", "gm"),
                                    variables[variableName].match.replace(/^(\s*)single\s+/, "$1")
                                );
                            }
                            // Remove non-initializing singleton declaration.
                            // We do not need to declare it in bash.
                            compiledSourceCode = compiledSourceCode.replace(
                                new RegExp("^" + REGEXP_ESCAPE(variables[variableName].match.replace(/=.*$/, "")) + "\\s*$", "gm"),
                                "#" + variables[variableName].match.replace(/=.*$/, "")
                            );
                            replacement = "$1" + singletonNamespacePrefix + "__" + variableName + "$2";
                        }

                        compiledSourceCode = compiledSourceCode.replace(
                            new RegExp("([\\s\\$\\{])" + REGEXP_ESCAPE(variableName) + "([\\s\\}=\\[\\]\"])", "g"),
                            replacement
                        );
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
                            new RegExp("([\\s])" + REGEXP_ESCAPE(functionName) + "([\\s\\{])", "g"),
                            "$1'${___bo_module_instance_alias___}'__" + functionName + "$2"
                        );
                    });


                    // Replace bash.origin modules reserved environment variables
                    compiledSourceCode = compiledSourceCode.replace(/\$\{?__FILENAME__\}?/g, PATH.basename(absoluteSourceFilePath));
                    compiledSourceCode = compiledSourceCode.replace(/\$\{?__DIRNAME__\}?/g, PATH.dirname(absoluteSourceFilePath));
                    compiledSourceCode = compiledSourceCode.replace(/\$\{?__BUILD_UUID__\}?/g, buildUUID);
                    compiledSourceCode = compiledSourceCode.replace(/\$\{?__ARGS__\}?/g, "'${___bo_module_instance_args___}'");
                    compiledSourceCode = compiledSourceCode.replace(/\$\{?__ARG1__\}?/g, "'${___bo_module_instance_arg1___}'");
                    compiledSourceCode = compiledSourceCode.replace(/\$\{?__ARG2__\}?/g, "'${___bo_module_instance_arg2___}'");


                    // TODO: Adjust indenting properly using sourcemint helper
                    compiledModuleCode = compiledModuleCode.split("%%%___COMPILED_MODULE_SOURCE___%%%");
                    compiledModuleCode.splice(1, 0, compiledSourceCode);
                    compiledModuleCode = compiledModuleCode.join("");

                    // Replace bash.origin modules variables
                    compiledModuleCode = compiledModuleCode.replace(/%%%___FILENAME___%%%/g, PATH.basename(absoluteSourceFilePath));
                    compiledModuleCode = compiledModuleCode.replace(/%%%___DIRNAME___%%%/g, PATH.dirname(absoluteSourceFilePath));
                    compiledModuleCode = compiledModuleCode.replace(/%%%___BUILD_UUID___%%%/g, buildUUID);

                    var rtContextUID = CRYPTO.createHash('sha1').update(
                        // TODO: Derive context UID based on features used in module file.
                        //       e.g. If NodeJS is involved, include the major version so that
                        //       binary modules get re-compiled when it changes.
                        "fake-context-id"
                    ).digest('hex');
                    compiledModuleCode = compiledModuleCode.replace(/%%%___RT_CONTEXT_UID___%%%/g, rtContextUID);

                    return null;
                });
            }).then(function () {


                return FS.outputFileAsync(targetFilePath, compiledModuleCode, "utf8");
            });
        });
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
