// const REQUIRE_NODE_CONFIG_FILENAME = '__$$REQUIRE_NODE_CONFIG$$__.js'
var getConfig = require('./config');
var config;

function toCommonJS(modulePath, options) {
    modulePath = modulePath.split('?', 1)[0].replace(/\\/g, '/');
    var moduleName;
    config = config || getConfig(options);
    for (var aliasName in config.base) {
        const path = config.base[aliasName];
        if (modulePath.startsWith(path)) {
            moduleName = aliasName + modulePath.slice(path.length);
            break;
        }
    }
    console.log('[modulePath]', modulePath);// eslint-disable-line no-console
    console.log('[moduleName]', moduleName);// eslint-disable-line no-console
    if (!moduleName) {
        throw new Error('File not include in config.base: ' + modulePath);
    }

    // if (modulePath.endsWith(REQUIRE_NODE_CONFIG_FILENAME)) {
    //     return `module.exports = { q: require('q')${configStr} }`;
    // }
    //var config = require('${config.base}/${REQUIRE_NODE_CONFIG_FILENAME}');

    var feConfigs = {};
    ['path', 'isDebug', 'preFetch', 'postFetch', 'reject'].forEach(key => feConfigs[key] = config[key]);

    return `var config = ${JSON.stringify(feConfigs, (key, value) => typeof value === 'function' ? value.toString() : value)};
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
    module.exports = new Proxy(createAjax([]), handler);`;
}

exports.toCommonJS = toCommonJS;