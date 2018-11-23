﻿'use strict';

//防止require-node被意外require到了浏览器环境
if (typeof global == 'undefined' && typeof window != 'undefined' && typeof window.alert === 'function') {
    var err = new Error('[FATAL ERROR]require-node should not run in browser, because it has code: require("../.." + modulePath)!');
    alert(err.message);
    throw err;
}

var config = {
    alias: {},
    resolve: null,
    _inject: function (req, res, callback) {
        return {
            $res: res,
            $req: req,
            $session: req && req.session,
            $body: req.body,
            callback: callback,

            $origin: req.headers && (req.headers.origin || 'http://' + (req.headers.host || req.hostname)),
            $hostname: req.hostname,
            $query: req.query
        }
    }
};
var aliasPathDict = {};

function call(req, res, next) {
    return _formatReqRes(req, res).then(function () {
        const originalUrlPath = req.originalUrl.split('?', 1)[0];
        if (aliasPathDict[originalUrlPath]) {
            //如下代码for seajs or requirejs loader
            var _browserify = require('./_browserify');
            try {
                res.status(200).send(_browserify.toCMD('../..' + originalUrlPath, aliasPathDict[originalUrlPath], config));
            }
            catch (err) {
                console.log(err && err.stack || err);
                console.log('_browserify err:', originalUrlPath, aliasPathDict[originalUrlPath]);
                res.status(404).send(err && err.stack);
            }
            return;
        }
        else if (!req.baseUrl && !originalUrlPath.startsWith(config.path || '/require-node')) {
            //throw new Error("__promise_break");
            throw { message: "__promise_break" };
        }

        var params = getParams(req);
        //console.log('call params:', params);
        var moduleName = params[0];
        var functionName = params[1];
        var moduleInstance = getModuleInstance(moduleName);
        if (!moduleInstance) {
            var err = new Error('没有此模块:' + moduleName);
            err.statusCode = 404;
            throw err;
        }
        var moduleFunction = getModuleFunction(moduleInstance, functionName);
        if (!moduleFunction) {
            var err = new Error(moduleName + '没有此方法:' + functionName);
            err.statusCode = 404;
            throw err;
        }
        var actualParams = params[2];
        var formalParams = getModuleFormalParams(moduleFunction);

        return new Promise(function (resolve, reject) {
            if (config.resolve) {
                try {
                    var ret = config.resolve(req, moduleName, functionName, formalParams, actualParams);
                    if (_isObject(ret) && ret.then) {
                        ret.then(resolve, reject);
                    } else {
                        resolve(ret);
                    }
                }
                catch (err) {
                    reject(err);
                }
            } else {
                resolve(true);
            }
        }).then(function (canCall) {
            if (!canCall) {
                var err = new Error('没有权限调用此方法:' + moduleName + '.' + functionName);
                err.statusCode = 403;
                throw err;
            }

            var isCallback = moduleFunctionIsCallback(formalParams);
            if (isCallback) {
                var callbackResolve, callbackReject;
                var callbackPromise = new Promise(function (resolve, reject) { callbackResolve = resolve; callbackReject = reject; });
                var callback = function (err, result) {
                    if (err) {
                        callbackReject(err);
                    }
                    else {
                        if (req.headers['x-require-node']) {
                            callbackResolve(arguments.length <= 2 ? result : Array.prototype.slice.call(arguments, 1));
                        }
                        else {
                            callbackResolve(result);
                        }
                    }
                }
            }

            parseActualParams(actualParams, actualParams, req, res);
            parseActualParams(actualParams, formalParams, req, res, callback);
            var result = moduleFunction.apply(moduleInstance, actualParams);
            return isCallback ? callbackPromise : result;
        });
    }).then(function (result) {
        if (res.finished) {
            return;
        }

        result = formatResult(result, _resultReplacer);
        if (req.headers['x-require-node']) {
            res.status(200).send([null, result]);
        }
        else {
            if (result && result.$view) {
                res.render(result.$view, result);
            }
            else {
                res.status(200).send(typeof result === 'number' ? (result + '') : result);
            }
        }
    }).catch(function (err) {
        config.isDebug && console.log('call err:', err);
        //err的stack属性默认是非枚举类型，改成可枚举，让res.status.send时序列化此属性
        if (err && err.stack) {
            Object.defineProperty(err, 'message', { value: err.message, enumerable: true });
            config.isDebug && Object.defineProperty(err, 'stack', { value: err.stack, enumerable: true });
            config.isDebug && console.log('call err enumerable stack:', err.stack);
        }

        if (res.finished) {//如果用户已经执行了res.end
            return;
        }

        if (req.headers['x-require-node']) {
            res.status(200).send([err]);
        }
        else {
            if (err && err.$view && res.render) {
                res.render(err.$view, err);
            }
            else {
                if (next && err && err.message === '__promise_break') {
                    return next();//next()以及_formatReqRes()前加return的目的是为了兼容koa
                }
                else {
                    res.status(err.statusCode || 500).send(err);
                }
            }
        }
    })
}

var pathPattern = /^\/([^\.\/]+)[\.\/]([^\(\[%]+)(?:(?:\(|\[|%5B)(.+)(?:\)|\]|%5D))?/i; //%5B %5D分别表示[ ]这两个字符
function getParams(req) {
    if (req.headers['x-require-node']) {
        config.isDebug && console.log('x-require-node:', req.method, req.url);
        if (req.body instanceof Array && req.body.length === 3 && req.body[2] instanceof Array) {
            return req.body;
        }
    }
    else {
        var urlPath = req.originalUrl.split('?', 1)[0].slice((req.baseUrl || config.path || '/require-node').length)
        var match = urlPath.match(pathPattern);
        config.isDebug && console.log('call path match', match);
        if (match) {
            if (req.method === 'POST') {
                var params = req.body instanceof Array ? req.body : [];
            }
            else {
                var params = match[3] ? JSON.parse('[' + decodeURIComponent(match[3]) + ']') : [];
            }
            //console.log('params',params);
            return [decodeURIComponent(match[1]), decodeURIComponent(match[2]), params];
        }
    }
    var err = new Error('提取参数错误');
    err.statusCode = 400;
    throw err;
}

function getModuleInstance(moduleName) {
    if (config.baseLastDir && moduleName.startsWith(config.baseLastDir)) {
        return require(config.base + moduleName);
    }
    var modulePath = getModulePath(moduleName);
    if (!moduleName || !modulePath) {
        console.error('moduleName:', moduleName, ' ,modulePath:', modulePath);
        return null;
    }
    return require('../..' + modulePath);
}

function getModuleFunction(moduleInstance, functionName) {
    let ret;
    if (functionName instanceof Array) {
        ret = moduleInstance;
        for (var i = 0; i < functionName.length; i++) {
            ret = ret[functionName[i]];
        }
    } else {
        ret = moduleInstance[functionName];
    }
    return ret;
}

function getModulePath(moduleName) {
    if (!moduleName || typeof moduleName !== 'string') {
        return null;
    }
    //为了安全，最后始终从alias里取出modulePath。如果仅根据moduleName以'/'开始就返回，那么任意后台js都可能被前端调用
    if (moduleName[0] === '/') {
        moduleName = aliasPathDict[moduleName];
    }
    return config.alias[moduleName];
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
                callbackFunctionNames.push(key)
            }
        }
        for (let key in $inject) {
            if ($inject[key] === callback) {
                callbackFunctionNames.push(key)
            }
        }
        //console.log('callbackFunctionNames:', callbackFunctionNames);
    }
    return formalParams.length > 0 && callbackFunctionNames.indexOf(formalParams[formalParams.length - 1]) > -1;
}

function _formatReqRes(req, res) {
    //console.log('req', req.url, req.originalUrl, req.body);
    req.originalUrl = req.originalUrl || req.url;
    if (!res.status) res.status = status => {
        res.statusCode = status;
        return res;
    }
    if (!res.send) res.send = data => {
        res.setHeader('Content-Type', 'application/json');
        res.end(typeof data === 'string' ? data : JSON.stringify(data));
    }

    return new Promise(function (resolve, reject) {
        if (req.hasOwnProperty('body')) {
            resolve();
        }
        else {
            require('body-parser').json({ limit: '800mb' })(req, res, resolve)
        }
    }).then(() => _parseDate(req.body));
}

function formatResult(json, replacer) {
    var ret = { ret: json };
    _formatResult(ret, replacer);
    return ret.ret;
}

function _formatResult(json, replacer) {
    if (!_isObject(json)) {
        return json;
    }

    for (var key in json) {
        if (json instanceof Object && !json.hasOwnProperty(key)) {//Object.create(null)对象没有hasOwnProperty方法
            continue;
        }
        var newJson = replacer(key, json[key]);
        if (json[key] !== newJson) {
            json[key] = newJson;
        } else {
            _formatResult(json[key], replacer)
        }
    }
}

function _resultReplacer(key, value) {
    if (!value) {
        return value;
    }

    if (key === 'headers') {
        console.log(value, value instanceof Map, value instanceof Array)
    }

    switch (typeof value) {
        case 'string': //为了提速，优先判断是否string，number
        case 'number':
            return value;
        case 'object':
            if (value instanceof Array) { //为了提速，优先判断是否Array
                return value;
            } else if (value instanceof Date) {
                return {
                    __$type$__: 'Date',
                    __$value$__: +value
                }
            } else if (value instanceof Map) {
                return {
                    __$type$__: 'Map',
                    __$value$__: [...value]
                }
            } else if (value instanceof Set) {
                return {
                    __$type$__: 'Set',
                    __$value$__: [...value]
                }
            } else {
                return value
            }
        case 'function':
            return {
                __$type$__: 'Function',
                __$value$__: '' + value,
                __$this$__: value.this
            }
        default:
            return value;
    }
    return value;
}

function _parseDate(obj) {
    if (!_isObject(obj)) {
        return;
    }

    for (var key in obj) {
        if (_isObject(obj[key])) {
            _parseDate(obj[key]);
        }
        else if (_isDateTimeStr(obj[key])) {
            obj[key] = new Date(obj[key]);
        }
    }
}

function _isObject(obj) {
    return obj !== null && typeof (obj) === 'object';
}

function _isDateTimeStr(str) {
    return typeof str === "string" && str[10] === "T" && str[str.length - 1] === "Z" && (str.length === 24 || str.length === 20);
}

module.exports = function (options) {
    for (var key in options) {
        config[key] = options[key];
    }
    if (config.alias) {
        for (var moduleName in config.alias) {
            var modulePath = config.alias[moduleName];
            aliasPathDict[modulePath] = moduleName;
            if (modulePath.slice(-3) !== '.js') {
                aliasPathDict[modulePath + '.js'] = moduleName;
            }
        }
    }
    else {
        config.alias = {};
        aliasPathDict = {};
    }
    //format config
    if (config.base) {
        var subBase = config.base.split(/[\\/]/);
        if (!subBase[subBase.length - 1]) {
            subBase = subBase.slice(0, -1);
        }
        config.base = subBase.slice(0, -1).join('/');
        config.baseLastDir = '/' + subBase[subBase.length - 1] + '/';
    }
    config.isDebug && console.log('require-node alias:', config.alias);
    //console.log('aliasPathDict', aliasPathDict)
    return call;
};
