var _qPath;
function getQPath(params) {
    _qPath = _qPath || (require('fs').existsSync(require('path').join(__dirname, 'node_modules/q')) ? 'require-node/node_modules/q' : 'q');
    return _qPath;
}

var c = require('./config');
var config;
function toCommonJS(modulePath, moduleName, options) {
    config = config || c.getConfig(options);

    var configStr = '';
    ['path', 'isDebug', 'reject'].forEach(key => {
        var value = config[key];
        if (value) {
            configStr += ',' + key + ':' + (typeof value === 'function' ? value.toString() : JSON.stringify(value));
        }
    })

    return `
    var config = { q: require(${JSON.stringify(getQPath())}) ${configStr} };
    var moduleName = ${JSON.stringify(moduleName)};
    var _require = require("require-node/_require.js");
    function createAjax(__keys_path__) {
        function _ajax() {
            return _require(moduleName, __keys_path__, arguments, config);
        }
        _ajax.__keys_path__ = __keys_path__;
        return _ajax;
    }
    var handler = {
        get: function (_ajax, functionName) {
            if (typeof _ajax[functionName] === 'function') {
                return _ajax[functionName];
            }
            return new Proxy(createAjax(_ajax.__keys_path__.concat(functionName)), handler);
        }
    };
    module.exports = new Proxy(createAjax([]), handler);`
}

exports.toCommonJS = toCommonJS;