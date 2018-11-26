module.exports = function (options) {

    var config = {
        path: '/require-node',
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
            };
        },

        // options1 and options2 is Object {req, res, moduleName, functionNames, formalParams, actualParams}
        preFetch: undefined,//(options1) => {} 
        preCall: undefined,//(options2) => {}
        postCall: undefined,//(result, options2) => {}
        postFetch: undefined,//(result, options1) => {}

        resolve: undefined, //deprecated, 
        reject: undefined, //deprecated, 
    };

    Object.assign(config, options);

    //format config
    if (config.base) {
        if (config.base['']) {
            throw new Error('config.base cannot has empty key: ' + JSON.stringify(config.base));
        }
        const base = typeof config.base === 'string' ? { '': config.base } : config.base;
        config.base = {};
        for (var aliasName in base) {
            var paths = base[aliasName].split(/[\\/]/);
            if (!paths[paths.length - 1]) {
                paths = paths.slice(0, -1);
            }
            config.base[aliasName] = paths.join('/');
        }
    } else {
        throw new Error('need config base');
    }

    return config;
};
