# require-node
## A node middleware let that browser js code can require node js code which is still running at node server

### *Example for how to use `require-node` in [https://www.npmjs.com/package/require-node-example](https://www.npmjs.com/package/require-node-example)*

***

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
Note: also support `promise`、`async/await` and `import` grammar.

## Installion
```
$ npm install require-node
```
**Note:** if use require-node with **require.js** or **sea.js**, you cann't install globally. **(Install without -g parameter)**

## Use
```
//middleware: function(req, res, next){ ... }
var middleware = require('require-node')({
    base: "path/to/server"
})
```

You can use this middleware in node HTTP
```
require('http').createServer(function (req, res) {
    middleware(req, res, function () {
        //req that require-node not process
    }
})
```

also, you can use this middleware in node [EXPRESS](https://www.npmjs.com/package/express)
```
var express = require('express')
var app = express()
app.use(middleware)
```

or, you can use this middleware in node [KOA](https://www.npmjs.com/package/koa)
```
var Koa = require('koa')
var app = new Koa()
app.use((ctx, next) => {
  var { req, res, body } = ctx;
  req.body = body;
  return middleware(req, res, next);
})
```

***

## Config options

**1. base: '/path/to/server', `ONLY this config is necessary!`**
> Config which back end file can be use in front end.

**2. path: '/require-node'** (default)
> Config which url path to be use sending ajax.

**3. withCredentials: false** (default)
> IN CROSS DOMAIN, config XMLHttpRequest object with cookie or not.

**4. isDebug: false** (default)
> Config require-node output log or not.

**5. resolve: function(req, moduleName, functionName, formalParams){ return true/promise; }**
> Sometimes, for security reasons, we will prevent some function calls. For each http request before processing, require-node calls this resolve configuration function, if the return is not true or promise resolve not true, call will be prevent.

**6. inject: function(req, res, callback){ return {curUser: req.session && req.session.curUser}; }**
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
    inject: function(req, res, callback){
        return {
            curUser: req.session && req.session.currentUser, //if you store currentUser in req.session
            otherService: ...
        }
    }
    alias: ...
})
```
In your back end function, you can use curUser like this:
```
function say(arg1, arg2, curUser, otherArg1, otherArg2){
    console.log(curUser)
}
exports.say = say
```

**3. Define Callback Name**

By default, I think of your callback style back end function like this:
```
function say(arg1, arg2, ... , callback){

}
exports.say = say
```
If your last formal parameter name is not a "callback", such as "cb", you need config inject:
```
var middleware = require('require-node')({
    inject: function(req, res, callback){
        return {
            //curUser: req.session && req.session.currentUser,
            cb: callback
        }
    }
    base: ...
})
```

That's all.

***

*Example for how to use `require-node` in [https://www.npmjs.com/package/require-node-example](https://www.npmjs.com/package/require-node-example)*