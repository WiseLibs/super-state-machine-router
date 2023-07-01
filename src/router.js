'use strict';
const Machine = require('./machine');
const CSRMachine = require('./csr-machine');

/*
	A router for URL pathnames which uses a state machine to match routes in
	O(n) time, while also supporting "wildcard" segments with user-defined
	variable/parameter names.

	The class is designed such that it can be constructed/cloned by passing an
	existing router to `new Router()`, which is useful when passing routers
	between worker threads, for example.
 */

module.exports = class Router {
	constructor({ _compressed, _machine, _routes }) {
		if (typeof _compressed !== 'boolean') {
			throw new TypeError('Expected _compressed to be a boolean');
		}
		if (typeof _machine !== 'object' || _machine === null) {
			throw new TypeError('Expected _machine to be an object');
		}
		if (!Array.isArray(_routes)) {
			throw new TypeError('Expected _routes to be an array');
		}


		this._compressed = _compressed;
		this._machine = _machine;
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
		const route = this._routes[
			this._compressed
				? CSRMachine.run(this._machine, charCodes)
				: Machine.run(this._machine, charCodes)
		];
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
