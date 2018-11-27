'use strict';
/* global define ActiveXObject */

define(function (require, exports, module) {
    var q = require('q');
    var _jsonEx = require('./_jsonEx');

    module.exports = function (moduleName, functionNames, actualParams, config, sync) {

        if (arguments.length < 2) {
            throw { msg: '$require arguments.length < 2' };
        }

        actualParams = Array.prototype.slice.call(actualParams);
        config = config || {};
        var async = !sync;
        // var q = config.q;
        var url = config.path;
        if (config.isDebug) url += '?' + moduleName + '/' + functionNames.join('.');

        var callback = null;
        if (typeof actualParams[actualParams.length - 1] === 'function') {
            callback = actualParams.pop();
        }

        var match = window.document.cookie.match(/(?:^|\s|;)XSRF-TOKEN\s*=\s*([^;]+)(?:;|$)/);
        var headers = {
            'Content-Type': 'application/json',
            'X-Require-Node': true,
            'X-Require-Node-Version': '2.0.3',
            'X-XSRF-TOKEN': match && match[1] //for xsrf header
        };

        if (async) {
            var defer = q.defer();
            var handleSuccess = function (result, status, xhr) {// eslint-disable-line no-unused-vars
                config.isDebug && console.log(arguments);// eslint-disable-line no-console
                callback && callback.apply(null, result);
                var err = result.shift();
                if (err) {
                    hookError(err);
                } else {
                    defer.resolve(result.length > 1 ? result : result[0]);
                }
            };
            var handleError = function (err, status, xhr) {// eslint-disable-line no-unused-vars
                config.isDebug && console.log(arguments);// eslint-disable-line no-console
                callback && callback.call(null, err);
                hookError(err);
            };
            var hookError = function (err) {
                if (config.reject) {
                    q().then(function () { return config.reject(err); }).then(defer.resolve, defer.reject);
                } else {
                    defer.reject(err);
                }
            };
        }

        var options = {
            type: 'POST',
            url: url,
            headers: headers,
            data: JSON.stringify([moduleName, functionNames, _jsonEx.encodeJSON(actualParams)]),
            async: async,
            success: handleSuccess,
            error: handleError
        };

        var xhr = createXHR(options);
        //xhr.withCredentials = true

        var options1 = { req: xhr, moduleName, functionNames, actualParams };

        if (async) {
            var preFetchPromise = Promise.resolve(config.preFetch && config.preFetch(options1));
            return preFetchPromise.then(function () {

                _ajax(xhr, options);
                return config.postCall ? config.postCall(defer.promise, options1) : defer.promise;
            });
        }
        else {
            config.preFetch && config.preFetch(options1);

            var ret = _ajax(xhr, options);
            var res = _jsonEx.parse(ret.responseText);
            config.isDebug && console.log('sync res:', res);// eslint-disable-line no-console
            // sync mode cannot use config.postCall
            if (res[0]) {
                throw res[0];
            } else {
                return res[1];
            }
        }


        function createXHR(options) {
            var xhr = function () {
                try { return new XMLHttpRequest(); }
                catch (e) {
                    try { return new ActiveXObject("Msxml2.XMLHTTP"); }
                    catch (e) { return new ActiveXObject("Microsoft.XMLHTTP"); }
                }
            }();

            xhr.open(options.type, options.url, options.async);

            options.headers = options.headers || {};
            for (var header in options.headers) {
                xhr.setRequestHeader(header, options.headers[header]);
            }
            return xhr;
        }

        function _ajax(xhr, options) {

            var requestDone, status, data, noop = null;
            xhr.onreadystatechange = function (isTimeout) {
                // The request was aborted
                if (!xhr || xhr.readyState === 0 || isTimeout === "abort") {
                    // Opera doesn't call onreadystatechange before this point
                    // so we simulate the call
                    if (!requestDone) {
                        options.complete && options.complete(data, status, xhr);
                    }

                    requestDone = true;
                    if (xhr) {
                        xhr.onreadystatechange = noop;
                    }

                    // The transfer is complete and the data is available, or the request timed out
                }
                else if (!requestDone && xhr && (xhr.readyState === 4 || isTimeout === "timeout")) {
                    requestDone = true;
                    xhr.onreadystatechange = noop;

                    status = isTimeout === "timeout" ?
                        "timeout" :
                        !httpSuccess(xhr) ?//really success?
                            "error" : "success";

                    if (status === "success") {
                        // Watch for, and catch, XML document parse errors
                        try {
                            // process the data (runs the xml through httpData regardless of callback)
                            data = _jsonEx.parse(xhr.responseText);
                        }
                        catch (parserError) {
                            status = "parsererror";
                        }
                    }

                    // Make sure that the request was successful or notmodified
                    if (status === "success" || status === "notmodified") {
                        // JSONP handles its own success callback
                        options.success && options.success(data, status, xhr);
                    }
                    else {
                        options.error && options.error(xhr, status, xhr);
                    }

                    // Fire the complete handlers
                    options.complete && options.complete(data, status, xhr);

                    if (isTimeout === "timeout") {
                        xhr.abort();
                    }
                }
            };

            xhr.send(options.data);
            return xhr;
        }

        // Determines if an XMLHttpRequest was successful or not
        function httpSuccess(xhr) {
            try {
                // IE error sometimes returns 1223 when it should be 204 so treat it as success, see #1450
                return !xhr.status && location.protocol === "file:" ||
                    xhr.status >= 200 && xhr.status < 300 ||
                    xhr.status === 304 || xhr.status === 1223;
            } catch (e) { }

            return false;
        }
    };
});