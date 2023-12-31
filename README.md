# super-state-machine-router [![test](https://github.com/WiseLibs/super-state-machine-router/actions/workflows/test.yml/badge.svg)](https://github.com/WiseLibs/super-state-machine-router/actions/workflows/test.yml)

An efficient URL router with the following features:

- [O(n)](https://en.wikipedia.org/wiki/Big_O_notation) routing time, regardless of the number of routes
- Route conflict/ambiguity detection (i.e., the order that routes are registered does not matter)
- Wildcard path segments are supported via `/foo/{myVariable}`
	- Wilcards can also match one or more segments with `/foo/{myVariable}+`
	- Or zero or more segmetns with `/foo/{myVariable}*`
- Under the hood, it uses a [compressed](https://en.wikipedia.org/wiki/Sparse_matrix#Compressed_sparse_row_(CSR,_CRS_or_Yale_format)), precise [state machine](https://en.wikipedia.org/wiki/Finite-state_machine) with low memory overhead

## Installation

```
npm install super-state-machine-router
```

> Requires Node.js v14.x.x or later.

## Usage

```js
const { RouterBuilder } = require('super-state-machine-router');

const router = new RouterBuilder()
	.add('/', myIndexPath)
	.add('/index.html', myIndexPath)
	.add('/style.css', myStylesheet)
	.add('/app.js', myScript)
	.add('/login/{loginMethod}', myLoginPage)
	.add('/api/{endpoint}+', myAPI)
	.build();

const match = router.route('/api/foo/bar/baz');
assert(match === myAPI);

const noMatch = router.route('/not/a/real/page');
assert(noMatch === undefined);
```

# API

## class RouterBuilder

RouterBuilder lets you build routers. You add routes to a builder by calling `.add()` and, when you're done adding routes, you can build the actual router with `.build()`.

### builder.add(*routeDefinition*, *value*) -> *this*

Adds a new route to the builder. The route definition should be a string starting with `/`. Trailing slashes and empty path segments are not allowed. The route can include [percent-encodings](https://en.wikipedia.org/wiki/URL_encoding).

The value that you pass to the second argument gets associated with the route, and will be returned by the [router](#class-router) when the route is matched.

Any path segment within the route definition can be `{someVariable}`, which will match any sequence of one or more characters (except `/`). You can have multiple variable segments within the same route.

```js
builder.add('/article/{id}/comments/{commentId}', someValue);
```

If the *last* segment is a variable, it may be followed by `+` or `*`, which allows it to match any number of additional segments afterwards. A variable with `+` must match at least one segment, but a variable with `*` can match zero segments.

```js
// Matches "/api/foo" and "/api/foo/bar", but not "/api"
builder.add('/api/{endpoint}+', someValue);

// Matches "/redirect/foo/bar" and "/redirect"
builder.add('/redirect/{newPath}*', someValue);
```

> Note that variables cannot be combined with literal characters in the same segment; either a segment is a variable, or it is a literal string.

### builder.addLiteral(*routeDefinition*, *value*) -> *this*

This is the same as `builder.add()`, except all special characters within the route definition are interpreted literally. As a result, percent-encodings and variables cannot be used within the route definition.

### builder.build() -> *Router*

Constructs and returns a [router](#class-router) based on the routes that have been added to the builder thus far. If there are multiple routes which could be matched by the same URL pathname, the ambiguity is detected and an error is thrown.

## class Router

This class lets you efficiently match URL pathnames against a set of routes.

You cannot construct this class directly (you have to use the [RouterBuilder](#class-routerbuilder)). However, if you pass a router to another thread (using [`worker_threads`](https://nodejs.org/docs/latest/api/worker_threads.html)), you can use `new Router(oldRouter)` to revive the router within the worker thread, with the correct prototype chain.

### router.route(*url*, [*outVariables*]) -> *value* or *undefined*

Attempts to match the given url (a string or [URL](https://nodejs.org/api/url.html#class-url) object) with a route. If a matching route is found, it returns the value that was originally associated with the route. If no matching route is found, it returns `undefined`.

[Percent-encodings](https://en.wikipedia.org/wiki/URL_encoding) are understood and interpretted correctly.

If you pass an object as the second parameter, the values of any variables within the matching route will be assigned to the object that you provide.

```js
const router = new RouterBuilder().add('/{first}/{second}', 123).build();

const variables = {};
const match = router.route('/foo/bar', variables);

assert(match === 123);
assert(variables.first === 'foo');
assert(variables.second === 'bar');
```

### router.map(*callback*) -> *Router*

Creates a new router that is equivalent to this one except that each route's associated value is mapped through the given callback function.

Using this method is more efficient than building multiple separate routers because the underlying state machine (which may be quite large) will be shared among the routers created by this method.

```js
const newRouter = oldRouter.map(value => value.id);
```

### Iterable protocol

Routers are [iterables](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols), which means you can iterate over them using a `for-of` loop to get each route's associated value (i.e., the values that may be returned by `router.route()`).

```js
for (const value of router) {
    console.log(value);
}
```

## License

[MIT](https://github.com/WiseLibs/super-state-machine-router/blob/master/LICENSE)
