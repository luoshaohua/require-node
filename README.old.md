# require-node
A node middleware let that browser js code can require node js code which is still running at node server

require-node: In client(eg: Browser), you can REQUIRE and CALL server side javascript which is still running at server(eg: Node.js).

require-node 让您能在前端（比如：浏览器）require后端javascript代码并调用，而这些后端代码在执行时依然在服务器上执行，而非浏览器里。

For example: A javascript module(test.js) in Node server, you can require and call that in Browser, like this:

比如：您在Node服务器有一个模块test.js，您可以在浏览器中如下引用并调用：

**In Browser code :**
```
var test = require('path/to/test.js')
test.getServerTime(function(err, result) {
    if(err) return;
    console.log('Node server time:', result.nodeServerTime)
    console.log('MySql server time:', result.mysqlServerTime)
})
```
**In Node server code (test.js) :**
```
var mysql = require('mysql')
function getServerTime(callback) {
    mysql.query('select now()', function(err, rows){
        callback(err, {
            nodeServerTime: new Date(),
            mysqlServerTime: rows && rows[0]
        })
    }) 
}

exports.getServerTime = getServerTime
```
Note: also support Promise.

## Installion
```
$ npm install require-node
```
**Note:** if use require-node with **require.js** or **sea.js**, you cann't install globally. **(Install without -g parameter)**

## Use
```
//middleware: function(req, res, next){ ... }
var middleware = require('require-node')({
    //path: '/call',
    //withCredentials: true,
    //isDebug: true,
    alias: {
        test: '/backEnd/test'
    }
})
```

You can use this middleware in node [EXPRESS](https://www.npmjs.com/package/express)
```
var express = require('express')
var app = express()
app.use(middleware)
```

You can also use this middleware in node HTTP
```
require('http').createServer(function (req, res) {
    middleware(req, res, function () {
        //req that require-node not process
    }
})
```

In Front End, there are three ways to use require-node

在前端，有三种方式使用require-node

## 1. With: Require.js

```
demo/
    |--node_modules/
    |   `--require-node/
    |--backEnd/
    |   `--test.js
    |--frontEnd/
    |   `--index.js
    |--index.html
    `--server.js
```

### Front end javascript code (RUN in Browser)
index.html
```
<html>
<head>
    <script src="http://apps.bdimg.com/libs/require.js/2.1.11/require.min.js" data-main="./frontEnd/index"></script>
    <!--script>require(["./frontEnd/index"])</script-->
</head>
<body>
</body>
</html>
```
frontEnd/index.js
```
define(function (require, exports, module) {
    console.log = console.error = function () { var log = console.log; return function (msg) { log(msg); document.body.innerHTML += msg + '<br/>' } } ()

    var test = require('../backEnd/test');

    //test.say('luoshaohua', new Date(), functon(err, result){})
    test.say('luoshaohua', new Date())
        .then(function (result) {
            console.log(result)
        }, function (err) {
            console.error(err)
        })

    //test.say_callback('luoshaohua', new Date(), functon(err, result){})
    test.say_callback('luoshaohua', new Date())
        .then(function (result) {
            console.log(result)
        }, function (err) {
            console.error(err)
        })

    //test.say_promise('luoshaohua', new Date(), functon(err, result){})
    test.say_promise('luoshaohua', new Date())
        .then(function (result) {
            console.log(result)
        }, function (err) {
            console.error(err)
        })
});
```

### Back end javascript code (RUN in Node Server)
server.js
```
var middleware = require('require-node')({
    //path: '/call',
    //withCredentials: true,
    //isDebug: true,
    alias: {
        test: '/backEnd/test'
    }
})

require('http').createServer(function (req, res) {
    middleware(req, res, function () {
        if (req.url === '/') {
            res.end(require('fs').readFileSync('./index.html'));
            return;
        }

        var filePath = req.url;
        if (filePath.startsWith('/frontEnd/') || filePath.startsWith('/node_modules/')) {
            res.end(require('fs').readFileSync('.' + filePath));
        }
        else {
            res.statusCode = 404;
            res.end('');
        }
    })
}).listen(2000);

console.log('Server running at http://127.0.0.1:2000/');
```

backEnd/test.js
```
function say(name, now) {
    if (name) {
        return '【SYNC】 Hello ' + name + ', now server time is: ' + now;
    }
    else {
        throw '【SYNC】 No name'
    }
}

function say_callback(name, now, callback) {
    setTimeout(function () {
        if (name) {
            callback(null, '【CALLBACK】 Hello ' + name + ', now server time is: ' + now)
        }
        else {
            callback('【CALLBACK】 No name')
        }
    }, 1000)
}

function say_promise(name, now) {
    return new Promise(function (resolve, reject) {
        if (name) {
            resolve('【PROMISE】 Hello ' + name + ', now server time is: ' + now);
        }
        else {
            reject('【PROMISE】 No name');
        }
    })
}

exports.say = say;
exports.say_callback = say_callback;
exports.say_promise = say_promise;
```

### Browser loaded index.html and Output
After run command:
```
$ node server.js 
```
Access url: http://127.0.0.1:2000 in your Browser, you will get:
```
【SYNC】 Hello luoshaohua, now server time is: Fri Dec 23 2016 15:14:08 GMT+0800 (中国标准时间)
【PROMISE】 Hello luoshaohua, now server time is: Fri Dec 23 2016 15:14:08 GMT+0800 (中国标准时间)
【CALLBACK】 Hello luoshaohua, now server time is: Fri Dec 23 2016 15:14:08 GMT+0800 (中国标准时间)
```
**Note: say(...) functon is run in node server, the time is node server's time.**


## 2. With: Sea.js
You only need to modify the index.html, the other files are same with the above (Require.js).

index.html
```
<html>
<head>
    <script src="http://apps.bdimg.com/libs/seajs/2.3.0/sea.js"></script>
    <script>seajs.use("./frontEnd/index")</script>
</head>
<body>
</body>
</html>
```


## 3. With: Webpack
You only need to modify the index.html and add webpack config file, the other files are same with the above (Require.js).

You need run webpack to Compile index.js to build.js, help with package: [require-node-loader](https://www.npmjs.com/package/require-node-loader)

index.html
```
<html>
<head>
    <script src="./frontEnd/build.js"></script>
</head>
<body>
</body>
</html>
```
webpack config file: webpack.config.js
```
module.exports = {
    module: {
        loaders: [
            {
                //test: /\.js$/, loader: 'require-node-loader?path=/call&withCredentials=true&isDebug=true',
                test: /\.js$/, loader: 'require-node-loader',
                include: [
                    require('path').resolve(__dirname, "backEnd")
                ]
            }
        ]
    },
    entry: { 'frontEnd/build.js': './frontEnd/index.js' },
    output: {
        path: __dirname,
        filename: '[name]'
    }
}
```
For more information about webpack, click [here](https://webpack.github.io/)


## Config options

**1. alias: { name: '/path/to/backEnd.js' }**
> Config which back end file can be use in front end.

**2. path: '/require-node'** (default)
> Config which url path to be use sending ajax.

**3. withCredentials: false** (default)
> IN CROSS DOMAIN, config XMLHttpRequest object with cookie or not.

**4. isDebug: false** (default)
> Config require-node output log or not.

**5. resolve: function(req, moduleName, functionName, formalParams){ return true/promise; }**
> Sometimes, for security reasons, we will prevent some function calls. For each http request before processing, require-node calls this resolve configuration function, if the return is not true or promise resolve not true, call will be prevent.

**6. inject: functon(req, res, callback){ return {curUser: req.session && req.session.curUser}; }**
> Use inject config, you can define Custom Injected Services. For more details, please refer to the next section: Inject Service.

## Inject Service
**1. Use Default Service**

If your back end function want use variable **$req**、**$res**、**$session**、http **$body**, you can define back end function like this:
```
function say(arg1, arg2, $req, otherArg1, otherArg2){
    console.log($req)
}
exports.say = say
```
require-node will inject variable req to $req.

**2. Use Custom Service**

If want define Custom Injected Services, you can config like this(eg: curUser service):
```
var middleware = require('require-node')({
    inject: functon(req, res, callback){
        return {
            curUser: req.session && req.session.currentUser, //if you store currentUser in req.session
            otherService: ...
        }
    }
    alias: ...
})
```
In your back end functon, you can use curUser like this:
```
function say(arg1, arg2, curUser, otherArg1, otherArg2){
    console.log(curUser)
}
exports.say = say
```

**3. Define Callback Name**

By default, I think of your callback style back end function like this:
```
functon say(arg1, arg2, ... , callback){

}
exports.say = say
```
If your last formal parameter name is not a "callback", such as "cb", you need config inject:
```
var middleware = require('require-node')({
    inject: functon(req, res, callback){
        return {
            //curUser: req.session && req.session.currentUser,
            cb: callback
        }
    }
    alias: ...
})
```

That's all.

Did you find that these services inject like Angular !!!