'use strict';
const Machine = require('./machine');
const TypedArray = Object.getPrototypeOf(Uint8Array);

/*
	A router for URL pathnames which uses a state machine to match routes in
	O(n) time, while also supporting "wildcard" segments with user-defined
	variable/parameter names.

	The class is designed such that it can be constructed/cloned by passing an
	existing router to `new Router()`, which is useful when passing routers
	between worker threads, for example.
 */

module.exports = class Router {
	constructor({ _stateMachine, _stateCount, _routes }) {
		if (!(_stateMachine instanceof TypedArray)) {
			throw new TypeError('Expected _stateMachine to be a TypedArray');
		}
		if (!Number.isInteger(_stateCount) || _stateCount < 1) {
			throw new TypeError('Expected _stateCount to be a positive integer');
		}
		if (!Array.isArray(_routes)) {
			throw new TypeError('Expected _routes to be an array');
		}

		this._stateMachine = _stateMachine;
		this._stateCount = _stateCount;
		this._routes = _routes;
	}

	route(url, outVariables = null) {
		if (!(url instanceof URL)) {
			if (typeof url !== 'string') {
				throw new TypeError('Expected url to be a string or URL object');
			}
			url = new URL(url, 'https://_');
		}

		let { pathname } = url;
		if (pathname.includes('%')) {
			pathname = normalizePathname(pathname);
		}

		const charCodes = Buffer.from(pathname, 'ascii');
		const route = this._routes[Machine.run(this._stateMachine, this._stateCount, charCodes)];
		if (!route) {
			return;
		}
		if (outVariables !== null && route.variables !== null) {
			resolveVariables(pathname, route.variables, outVariables);
		}
		return route.value;
	}
};

function normalizePathname(pathname) {
	return pathname.split('/')
		.map(decodeURIComponent)
		.map(encodeURIComponent)
		.join('/');
}

function resolveVariables(pathname, variables, output) {
	const segments = pathname.split('/');
	for (let i = 0; i < variables.length; ++i) {
		const variable = variables[i];
		if (variable) {
			if (variable.quantifier) {
				output[variable.name] = segments.slice(i + 1).map(decodeURIComponent);
			} else {
				output[variable.name] = decodeURIComponent(segments[i + 1] || '');
			}
		}
	}
}
