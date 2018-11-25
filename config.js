exports.getConfig = function (options) {

    var config = {
        path: '/require-node',
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

    for (var key in options) {
        config[key] = options[key];
    }

    //format config
    if (config.base) {
        var subBase = config.base.split(/[\\/]/);
        if (!subBase[subBase.length - 1]) {
            subBase = subBase.slice(0, -1);
        }
        config.base = subBase.slice(0, -1).join('/');
        config.baseLastDir = '/' + subBase[subBase.length - 1] + '/';
    } else {
        throw new Error('need config base')
    }

    return config;
}