const IN_NODE = !(typeof global == 'undefined' && typeof window != 'undefined' && typeof window.alert === 'function');

function _formatResponse(key, value) {
    if (!(value && typeof value === 'object' && value.hasOwnProperty('__$RN_type$__') && value.hasOwnProperty('__$RN_value$__'))) {
        return value;
    }
    switch (value.__$RN_type$__) {
        case 'Function':
            //config.isDebug && console.log(value)
            var ret = eval("(function(){return " + value.__$RN_value$__ + " })()");
            if (value.__$RN_this$__) {
                return ret.bind(value.__$RN_this$__);
            } else {
                return ret;
            }
        case 'Date':
            return new Date(value.__$RN_value$__);
        case 'Map':
            return (IN_NODE || window.Map) && new Map(value.__$RN_value$__);
        case 'Set':
            return (IN_NODE || window.Set) && new Set(value.__$RN_value$__);
        default:
            console.warn('unknown type', value.__$RN_type$__, value);// eslint-disable-line no-console
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

    switch (typeof value) {
        case 'string': //为了提速，优先判断是否string，number
        case 'number':
            return value;
        case 'object':
            if (value instanceof Array) { //为了提速，优先判断是否Array
                return value;
            } else if (value instanceof Date) {
                return {
                    __$RN_type$__: 'Date',
                    __$RN_value$__: +value
                };
            } else if ((IN_NODE || window.Map) && value instanceof Map) {
                return {
                    __$RN_type$__: 'Map',
                    __$RN_value$__: [...value]
                };
            } else if ((IN_NODE || window.Set) && value instanceof Set) {
                return {
                    __$RN_type$__: 'Set',
                    __$RN_value$__: [...value]
                };
            } else {
                return value;
            }
        case 'function':
            return {
                __$RN_type$__: 'Function',
                __$RN_value$__: '' + value,
                __$RN_this$__: value.this
            };
        default:
            return value;
    }
    return value;// eslint-disable-line no-unreachable
}

exports.encodeJSON = function (json) {
    return formatResult(json, _resultReplacer);
};

////////////////////////////////////////////////////////////

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
    return obj !== null && typeof obj === 'object';
}

exports.decodeJSON = decodeJSON;
