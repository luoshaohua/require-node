# require-node
## A node middleware let that browser js code can require node js code which is still running at node server

### *Example for how to use `require-node` in [https://github.com/luoshaohua/require-node-example](https://github.com/luoshaohua/require-node-example)*

---

require-node: In client(eg: Browser), you can REQUIRE and CALL server side javascript which is still running at server(eg: Node.js).

require-node 让您能在前端（比如：浏览器）require后端javascript代码并调用，而这些后端代码在执行时依然在服务器上执行，而非浏览器里。

For example: A javascript module(test.js) in Node server, you can require and call that in Browser, like this:

比如：您在Node服务器有一个模块test.js，您可以在浏览器中如下引用并调用：

**In Browser code :**
```
var test = require('path/to/test.js')

var sum = await test.add(1, 2)     // sum = 3
var env = await test.getNodeEnv()  // env is server env value
```
**In Node server code (test.js) :**
```
exports.add = function (a, b) {
    return a + b;
}

exports.getNodeEnv = function () {
    return process.env;
}
```
Note: also support `promise`、`async/await` and `import` grammar.

## Installion
```
$ npm install require-node
```

## Use

`middleware`: function (req, res, next) { ... }
```
var requireNode = require('require-node')
var middleware = requireNode({ base: "path/to/server" })
```

You can use this `middleware` in node HTTP :
```
require('http').createServer(function (req, res) {
    middleware(req, res, function () {
        //req that require-node not process
    }
})
```

**also**, you can use this `middleware` in node [EXPRESS](https://www.npmjs.com/package/express) :
```
var express = require('express')
var app = express()
app.use(middleware)
```

**or**, you can use this `middleware` in node [KOA](https://www.npmjs.com/package/koa) :
```
var Koa = require('koa')
var app = new Koa()
app.use((ctx, next) => {
  var { req, res, body } = ctx;
  req.body = body;
  return middleware(req, res, next);
})
```

---

## Config options

**1. base: '/path/to/server', `ONLY this config is necessary!`**
> Config which back end file or dir can be use in front end. `base` can be set `String`/`Array`/`Object`.

**2. path: '/require-node'** (default)
> Config which url path to be use sending ajax.

**3. isDebug: false** (default)
> Config require-node output log or not.

**4. hook function**
> Sometimes, for some reason(example: `security` or `login`), we will prevent some function calls. For each http request before processing, require-node calls `preFetch` in Browser and calls `preCall` in Node Server (if throw error or return promise reject, call will be prevent), after server api function called, `postCall` will be call in Node Server and `postFetch` alse be call in Browser.

**preFetch: function (options) { return promise or common value; }**  
**preCall: function (options) { return promise or common value; }**  
**postCall: function (apiReturn, options) { return a new apiReturn; }**  
**postFetch: function (apiReturn, options) { return a new apiReturn; }**  

options's structure: { req, res, moduleName, functionNames, formalParams, actualParams }  
`Note`: In Browser, `req` is xhr(`XMLHttpRequest`) object.

**5. inject: function(req, res){ return {curUser: req.session && req.session.curUser}; }**
> Use inject config, you can define Custom Injected Services. For more details, please refer to the next section: Inject Service.

## Inject Service
**1. Use Default Service**

If your back end function want use variable `$req`、`$res`、`$session`、http `$body`, you can define back end function like this:
```
function say(arg1, arg2, $req, arg4, arg5){
    console.log($req) // $req is node http req object
}
exports.say = say
```
require-node will inject variable req to $req.

**2. Use Custom Service**

If want define Custom Injected Services, you can config like this(eg: curUser service):
```
var middleware = require('require-node')({
    base: "path/to/server"
    inject: function(req, res){
        return {
            curUser: req.session && req.session.currentUser, //if you store currentUser in req.session
            otherService: ...
        }
    }
})
```
In your back end function, you can use curUser like this:
```
function say(arg1, arg2, curUser, arg4, arg5){
    console.log(curUser)
}
exports.say = say
```

That's all.

---

*Example for how to use `require-node` in [https://github.com/luoshaohua/require-node-example](https://github.com/luoshaohua/require-node-example)*