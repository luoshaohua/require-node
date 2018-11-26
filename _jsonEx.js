function _formatResponse(key, value) {
    if (!(value && typeof value === 'object' && value.hasOwnProperty('__$type$__') && value.hasOwnProperty('__$value$__'))) {
        return value;
    }
    switch (value.__$type$__) {
        case 'Function':
            //config.isDebug && console.log(value)
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
            console.warn('unknown type', value.__$type$__, value);// eslint-disable-line no-console
            return value;
    }
}

exports.parse = function (str) {
    return JSON.parse(str, _formatResponse);
};



////////////////////////////////////////////////////////////

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
            _formatResult(json[key], replacer);
        }
    }
}

function _resultReplacer(key, value) {
    if (!value) {
        return value;
    }

    if (key === 'headers') {
        console.log(value, value instanceof Map, value instanceof Array);// eslint-disable-line no-console
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
                };
            } else if (value instanceof Map) {
                return {
                    __$type$__: 'Map',
                    __$value$__: [...value]
                };
            } else if (value instanceof Set) {
                return {
                    __$type$__: 'Set',
                    __$value$__: [...value]
                };
            } else {
                return value;
            }
        case 'function':
            return {
                __$type$__: 'Function',
                __$value$__: '' + value,
                __$this$__: value.this
            };
        default:
            return value;
    }
    return value;// eslint-disable-line no-unreachable
}

exports.encodeJSON = function (json) {
    return formatResult(json, _resultReplacer);
};


//////////////////////////////
function decodeJSON(obj) {
    if (!_isObject(obj)) {
        return;
    }

    for (var key in obj) {
        if (_isObject(obj[key])) {
            obj[key] = _formatResponse(key, obj[key]);
            decodeJSON(obj[key]);
        }
    }
}

function _isObject(obj) {
    return obj !== null && typeof (obj) === 'object';
}

exports.decodeJSON = decodeJSON;
