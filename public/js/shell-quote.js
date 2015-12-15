/**
 * @file Utilities for parsing and working with shell quoting.
 */

'use strict';

/**
 * Top-level map function.
 *
 * @param {Array<E>} arr - The array to map over.
 * @param {Function} fn - The function to apply to
 * each element in the array.
 * @returns {Array<E>} The array with each element
 * modified by the mapping function.
 * @public
 */
var map = function(arr, fn) {
    return arr.map(fn);
};

/**
 * Top-level filter function.
 *
 * @param {Array<E>} arr - The array to filter.
 * @param {Function} fn - Predicate function. When
 * it returns true for an element in the array,
 * that element is included in the returned array.
 * @returns {Array<E>} The filtered array.
 * @public
 */
var filter = function(arr, fn) {
    return arr.filter(fn);
};

/**
 * Top-level reduce function.
 *
 * @param {Array<E>} arr - The array to reduce.
 * @param {Function} fn - A reducing function
 * to apply to the array.
 * @returns {E} The reduced array.
 * @public
 */
var reduce = function(arr, fn) {
    return arr.reduce(fn);
};

var ShellQuote = {};

/**
 * Transforms an array of elements
 * into a properly quoted string.
 *
 * @param {Array<Object|String>} xs - Array of elements.
 * @returns {String} The string, properly quoted.
 * @public
 */
ShellQuote.quote = function(xs) {
    return map(xs, function(s) {
        if (s && typeof s === 'object') {
            return s.op.replace(/(.)/g, '\\$1');
        } else if (/["\s]/.test(s) && !/'/.test(s)) {
            return "'" + s.replace(/(['\\])/g, '\\$1') + "'";
        } else if (/["'\s]/.test(s)) {
            return '"' + s.replace(/(["\\$`(){}!#&*|])/g, '\\$1') + '"';
        } else {
            return String(s).replace(/([\\$`(){}!#&*|])/g, '\\$1');
        }
    }).join(' ');
};

var CONTROL = '(?:' + [
    '\\|\\|', '\\&\\&', ';;', '\\|\\&', '[&;()|<>]'
].join('|') + ')';

var META = '|&;()<> \\t';
var BAREWORD = '(\\\\[\'"' + META + ']|[^\\s\'"' + META + '])+';
var SINGLE_QUOTE = '"((\\\\"|[^"])*?)"';
var DOUBLE_QUOTE = '\'((\\\\\'|[^\'])*?)\'';
var TOKEN = '';

for (var i = 0; i < 4; i++) {
    TOKEN += (Math.pow(16, 8) * Math.random()).toString(16);
}

/**
 * Scans/parses a shell-quoted string.
 *
 * @param {Object|String} s - Element to parse.
 * @param {Functio|Object} env - Environment function or object.
 * @returns {Object} Parsed content.
 * @public
 */
function parse(s, env) {
    var chunker = new RegExp([
        '(' + CONTROL + ')', // control chars
        '(' + BAREWORD + '|' + SINGLE_QUOTE + '|' + DOUBLE_QUOTE + ')*'
    ].join('|'), 'g');
    var match = filter(s.match(chunker), Boolean);

    if (!match) {
        return [];
    }

    if (!env) {
        env = {};
    }

    /**
     * Gets the var keyed by `key`.
     *
     * @param {Object} _ - Context object (not used).
     * @param {String} pre - Prefix to prepend.
     * @param {String} key - Key supplied to the env (function|object).
     * @returns {String} The environment variable.
     * @public
     */
    function getVar(_, pre, key) {
        var r = typeof env === 'function' ? env(key) : env[key];
        if (r === undefined) {
            r = '';
        }

        if (typeof r === 'object') {
            return pre + TOKEN + JSON.stringify(r) + TOKEN;
        } else {
            return pre + r;
        }
    }

    return map(match, function(s) {
        if (RegExp('^' + CONTROL + '$').test(s)) {
            return { op: s };
        }

        // Hand-written scanner/parser for Bash quoting rules:
        //
        //  1. Inside single quotes, all characters are printed literally.
        //  2. Inside double quotes, all characters are printed literally
        //     except variables prefixed by '$' and backslashes followed by
        //     either a double quote or another backslash.
        //  3. Outside of any quotes, backslashes are treated as escape
        //     characters and not printed (unless they are themselves escaped)
        //  4. Quote context can switch mid-token if there is no whitespace
        //     between the two quote contexts (e.g. all'one'"token" parses as
        //     "allonetoken")
        var SQ = "'";
        var DQ = '"';
        var BS = '\\';
        var DS = '$';
        var quote = false;
        var varname = false;
        var esc = false;
        var out = '';
        var isGlob = false;

        for (var i = 0, len = s.length; i < len; i++) {
            var c = s.charAt(i);
            isGlob = isGlob || (!quote && (c === '*' || c === '?'));
            if (esc) {
                out += c;
                esc = false;
            } else if (quote) {
                if (c === quote) {
                    quote = false;
                } else if (quote === SQ) {
                    out += c;
                } else { // Double quote
                    if (c === BS) {
                        i += 1;
                        c = s.charAt(i);
                        if (c === DQ || c === BS || c === DS) {
                            out += c;
                        } else {
                            out += BS + c;
                        }
                    } else if (c === DS) {
                        out += parseEnvVar();
                    } else {
                        out += c;
                    }
                }
            } else if (c === DQ || c === SQ) {
                quote = c;
            } else if (RegExp('^' + CONTROL + '$').test(c)) {
                return { op: s };
            } else if (c === BS) {
                esc = true;
            } else if (c === DS) {
                out += parseEnvVar();
            } else {
                out += c;
            }
        }

        if (isGlob) {
            return { op: 'glob', pattern: out };
        }

        return out;

        /**
         * Parses an environment variable.
         *
         * @returns {String} The environment variable.
         * @private
         */
        function parseEnvVar() {
            i += 1;
            var varend;
            var varname;

            // debugger
            if (s.charAt(i) === '{') {
                i += 1;
                if (s.charAt(i) === '}') {
                    throw new Error('Bad substitution: ' + s.substr(i - 2, 3));
                }
                varend = s.indexOf('}', i);
                if (varend < 0) {
                    throw new Error('Bad substitution: ' + s.substr(i));
                }
                varname = s.substr(i, varend - i);
                i = varend;
            } else if (/[*@#?$!_\-]/.test(s.charAt(i))) {
                varname = s.charAt(i);
                i += 1;
            } else {
                varend = s.substr(i).match(/[^\w\d_]/);
                if (!varend) {
                    varname = s.substr(i);
                    i = s.length;
                } else {
                    varname = s.substr(i, varend.index);
                    i += varend.index - 1;
                }
            }
            return getVar(null, '', varname);
        }

    });
}

/**
 * Scans/parses a shell-quoted string.
 *
 * @param {Object|String} s - Element to parse.
 * @param {Function|Object} env - Environment function or object.
 * @returns {Object} Parsed content.
 * @public
 */
ShellQuote.parse = function(s, env) {
    var mapped = parse(s, env);

    if (typeof env !== 'function') {
        return mapped;
    }

    return reduce(mapped, function(acc, s) {
        if (typeof s === 'object') {
            return acc.concat(s);
        }

        var xs = s.split(RegExp('(' + TOKEN + '.*?' + TOKEN + ')', 'g'));
        if (xs.length === 1) {
            return acc.concat(xs[0]);
        }

        return acc.concat(map(filter(xs, Boolean), function(x) {
            if (RegExp('^' + TOKEN).test(x)) {
                return JSON.parse(x.split(TOKEN)[1]);
            } else {
                return x;
            }
        }));
    }, []);
};
