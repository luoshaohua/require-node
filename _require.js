'use strict';

define(function (require, exports, module) {

    module.exports = function (moduleName, functionNames, actualParams, config, sync) {

        if (arguments.length < 2) {
            throw { msg: '$require arguments.length < 2' };
        }

        actualParams = Array.prototype.slice.call(actualParams);
        config = config || {};
        var async = !sync;
        var q = config.q;
        var url = config.path;
        if (config.isDebug) url += '?' + moduleName + '::' + functionNames.join('.');

        var callback = null;
        if (typeof actualParams[actualParams.length - 1] === 'function') {
            callback = actualParams.pop();
        }

        var match = window.document.cookie.match(/(?:^|\s|;)XSRF-TOKEN\s*=\s*([^;]+)(?:;|$)/);
        var headers = {
            'Content-Type': 'application/json',
            'X-Require-Node': true,
            'X-Require-Node-Version': '2.0.0',
            'X-XSRF-TOKEN': match && match[1] //for xsrf header
        };

        if (async) {
            var defer = q.defer();
            var handleSuccess = function (result, status, xhr) {
                config.isDebug && console.log(arguments);
                callback && callback.apply(null, result);
                var err = result.shift();
                if (err) {
                    hookError(err);
                } else {
                    defer.resolve(result.length > 1 ? result : result[0]);
                }
            }
            var handleError = function (err, status, xhr) {
                config.isDebug && console.log(arguments);
                callback && callback.call(null, err);
                hookError(err);
            }
            var hookError = function (err) {
                if (config.reject) {
                    q().then(function () { return config.reject(err) }).then(defer.resolve, defer.reject);
                } else {
                    defer.reject(err);
                }
            }
        }

        var options = {
            type: 'POST',
            url: url,
            headers: headers,
            data: JSON.stringify([moduleName, functionNames, actualParams]),
            async: async,
            success: handleSuccess,
            error: handleError
        }

        var ret = _ajax(options);
        if (async) {
            return defer.promise;
        }
        else {
            var res = JSON.parse(ret.responseText, _formatResponse);
            config.isDebug && console.log('sync res:', res);
            if (res[0]) {
                throw res[0];
            } else {
                return res[1];
            }
        }

        function _formatResponse(key, value) {
            if (!(value && typeof value === 'object' && value.hasOwnProperty('__$type$__') && value.hasOwnProperty('__$value$__'))) {
                return value;
            }
            switch (value.__$type$__) {
                case 'Function':
                    config.isDebug && console.log(value)
                    var ret = eval("(function(){return " + value.__$value$__ + " })()");
                    if (value.__$this$__) {
                        return ret.bind(value.__$this$__);
                    } else {
                        return ret;
                    }
                case 'Date':
                    return new Date(value.__$value$__);
                case 'Map':
                    return new Map(value.__$value$__);
                case 'Set':
                    return new Set(value.__$value$__);
                default:
                    console.warn('unknown type', value.__$type$__, value)
                    return value;
            }
        }

        function _ajax(options) {
            var xhr = function () {
                try { return new XMLHttpRequest(); }
                catch (e) {
                    try { return new ActiveXObject("Msxml2.XMLHTTP"); }
                    catch (e) { return new ActiveXObject("Microsoft.XMLHTTP"); }
                }
            }()

            xhr.open(options.type, options.url, options.async);

            options.headers = options.headers || {};
            for (var header in options.headers) {
                xhr.setRequestHeader(header, options.headers[header])
            }
            //xhr.withCredentials = true

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

                    var errMsg;

                    if (status === "success") {
                        // Watch for, and catch, XML document parse errors
                        try {
                            // process the data (runs the xml through httpData regardless of callback)
                            data = JSON.parse(xhr.responseText, _formatResponse);
                        }
                        catch (parserError) {
                            status = "parsererror";
                            errMsg = parserError;
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
    }
});