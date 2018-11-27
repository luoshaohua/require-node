'use strict';

if (typeof global == 'undefined' && typeof window != 'undefined' && typeof window.alert === 'function') {
    var err = new Error('[FATAL ERROR]require-node should not run in browser, because it has code: require("../.." + modulePath)!');
    alert(err.message);
    throw err;
}

var _jsonEx = require('./_jsonEx');
var getConfig = require('./config');
var config;

module.exports = function (options) {
    if (options.resolve) {
        console.warn('config.resolve is deprecated, please use config.preCall! Note: arguments changed!!');// eslint-disable-line no-console
    }
    if (options.reject) {
        console.warn('config.reject is deprecated, please use config.postFetch! Note: arguments changed!!');// eslint-disable-line no-console
    }

    config = getConfig(options);
    return call;
};

function call(req, res, next) {
    return _formatReqRes(req, res).then(function () {
        //TODO:: POST http://xxx.com/require-node?... HTTP/1.1, req.originalUrl=?
        if (!req.originalUrl.startsWith(config.path)) {
            throw new Error("__promise_break__");
        }

        var params = getParams(req);
        //console.log('call params:', params);
        var moduleName = params[0];
        var moduleInstance = getModuleInstance(moduleName);
        var functionNames = params[1];
        var moduleFunction = getModuleFunction(moduleInstance, functionNames);
        var actualParams = params[2];
        var formalParams = getModuleFormalParams(moduleFunction);

        const options2 = { req, res, moduleName, functionNames, formalParams, actualParams };
        const p1 = Promise.resolve(config.preCall && config.preCall(options2));
        const p2 = Promise.resolve(config.resolve && config.resolve(req, moduleName, functionNames, formalParams, actualParams));

        return Promise.all([p1, p2]).then(function () {
            var isCallback = moduleFunctionIsCallback(formalParams);
            if (isCallback) {
                var callbackResolve, callbackReject;
                var callbackPromise = new Promise(function (resolve, reject) { callbackResolve = resolve; callbackReject = reject; });
                var callback = function (err, result) {
                    if (err) {
                        callbackReject(err);
                    } else {
                        if (req.headers['x-require-node']) {
                            callbackResolve(arguments.length <= 2 ? result : Array.prototype.slice.call(arguments, 1));
                        } else {
                            callbackResolve(result);
                        }
                    }
                };
            }

            parseActualParams(actualParams, actualParams, req, res);
            parseActualParams(actualParams, formalParams, req, res, callback);
            var result = moduleFunction.apply(moduleInstance, actualParams);
            const ret = isCallback ? callbackPromise : result;
            return config.postCall ? config.postCall(ret, options2) : ret;
        });
    }).then(function (result) {
        if (res.finished) { //res.end() has call
            return;
        }

        result = _jsonEx.encodeJSON(result);
        if (req.headers['x-require-node']) {
            res.status(200).send([null, result]);
        } else {
            if (result && result.$view) {
                res.render(result.$view, result);
            } else {
                res.status(200).send(typeof result === 'number' ? (result + '') : result);
            }
        }
    }).catch(function (err) {
        if (next && err && err.message === '__promise_break__') {
            return next();//next() and _formatReqRes() has return is for koa
        }

        config.isDebug && console.log('call err:', err);// eslint-disable-line no-console
        if (err && err.stack) {
            //let err.stack can stringify in funtion: res.status.send
            Object.defineProperty(err, 'message', { value: err.message, enumerable: true });
            config.isDebug && Object.defineProperty(err, 'stack', { value: err.stack, enumerable: true });
            config.isDebug && console.log('call err enumerable stack:', err.stack);// eslint-disable-line no-console
        }

        if (res.finished) {
            return;
        }

        if (req.headers['x-require-node']) {
            res.status(200).send([err]);
        } else {
            if (err && err.$view && res.render) {
                res.render(err.$view, err);
            } else {
                res.status(err.statusCode || 500).send(err);
            }
        }
    });
}

function _formatReqRes(req, res) {
    //console.log('req', req.url, req.originalUrl, req.body);
    req.originalUrl = req.originalUrl || req.url;
    if (!res.status) res.status = status => {
        res.statusCode = status;
        return res;
    };
    if (!res.send) res.send = data => {
        res.setHeader('Content-Type', 'application/json');
        res.end(typeof data === 'string' ? data : JSON.stringify(data));
    };

    return new Promise(function (resolve, reject) {
        if (req.hasOwnProperty('body')) {
            resolve();
        } else {
            require('body-parser').json({ limit: '800mb' })(req, res, resolve);
        }
    }).then(() => _jsonEx.decodeJSON(req.body));
}

// eslint-disable-next-line no-useless-escape
var pathPattern = /^\/([^\.\/]+)[\.\/]([^\(\[%]+)(?:(?:\(|\[|%5B)(.+)(?:\)|\]|%5D))?/i; //%5B is '[', %5D is ']'
function getParams(req) {
    if (req.headers['x-require-node']) {
        config.isDebug && console.log('x-require-node:', req.method, req.url);// eslint-disable-line no-console
        if (req.body instanceof Array && req.body.length === 3 && req.body[1] instanceof Array && req.body[2] instanceof Array) {
            return req.body;
        }
    } else {
        var urlPath = req.originalUrl.split('?', 1)[0].slice(config.path.length);
        var match = urlPath.match(pathPattern);
        config.isDebug && console.log('call path match', match);// eslint-disable-line no-console
        if (match) {
            var params;
            if (req.method === 'POST') {
                params = req.body instanceof Array ? req.body : [];
            } else {
                params = match[3] ? JSON.parse('[' + decodeURIComponent(match[3]) + ']') : [];
            }
            //console.log('params',params);
            return [decodeURIComponent(match[1]), [decodeURIComponent(match[2])], params];
        }
    }
    var err = new Error('Bad Request Arguments');
    err.statusCode = 400;
    throw err;
}

function getModuleInstance(moduleName) {
    if (config.base[moduleName]) {
        return require(config.base[moduleName]);
    } else if (config.base['']) {
        return require(config.base[''] + moduleName);
    } else {
        const aliasName = moduleName.split('/', 1)[0];
        if (config.base[aliasName]) {
            return require(config.base[aliasName] + moduleName.slice(aliasName.length));
        } else {
            var err = new Error('Not Found Module:' + moduleName);
            err.statusCode = 404;
            throw err;
        }
    }
}

function getModuleFunction(moduleInstance, functionNames) {
    let ret = moduleInstance;
    for (var i = 0; i < functionNames.length; i++) {
        ret = ret[functionNames[i]];
    }
    if (ret === moduleInstance || !ret) {
        var err = new Error('Not Found Function:' + functionNames.join('.'));
        err.statusCode = 404;
        throw err;
    }
    return ret;
}

function getModuleFormalParams(moduleFunction) {
    //提取形参列表
    if (moduleFunction.$formalParams) {
        return moduleFunction.$formalParams;
    }
    else {
        var formalParamsStr = moduleFunction.toString().split(')')[0].split('(')[1];
        var ret = formalParamsStr ? formalParamsStr.split(',').map(function (i) { return i.trim(); }) : [];
        moduleFunction.$formalParams = ret;//缓存把结果缓存起来
        return ret;
    }
}

function parseActualParams(params, refParams, req, res, callback) {
    var _$inject = config._inject(req, res, callback);
    var $inject = config.inject ? config.inject(req, res, callback) : {};

    refParams.forEach(function (refParam, index) {
        params[index] = $inject[refParam] || _$inject[refParam] || params[index];
    });
}

var callbackFunctionNames;
function moduleFunctionIsCallback(formalParams) {
    if (!callbackFunctionNames) {
        var callback = {};
        var _$inject = config._inject({}, {}, callback);
        var $inject = config.inject ? config.inject({}, {}, callback) : {};
        callbackFunctionNames = [];
        for (let key in _$inject) {
            if (_$inject[key] === callback) {
                callbackFunctionNames.push(key);
            }
        }
        for (let key in $inject) {
            if ($inject[key] === callback) {
                callbackFunctionNames.push(key);
            }
        }
        //console.log('callbackFunctionNames:', callbackFunctionNames);
    }
    return formalParams.length > 0 && callbackFunctionNames.indexOf(formalParams[formalParams.length - 1]) > -1;
}
