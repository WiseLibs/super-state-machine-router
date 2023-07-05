'use strict';
const Machine = require('./machine');
const CSRMachine = require('./csr-machine');

const ENCODED_CHAR = /[^a-zA-Z0-9/_.!~*'()-]/;

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
		if (!pathname.startsWith('/')) {
			return; // It's an opaque path, such in "mailto:foo@bar.com"
		}
		if (ENCODED_CHAR.test(pathname)) {
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
	if (pathname === '/') {
		// In this case, we know there is only one variable, and it must have
		// the "*" quantifier. We have to handle this case specially because we
		// want to represent the "/" pathname as an empty array (i.e., there are
		// no segments), instead of representing it as a single segment with a
		// value of "" (empty string).
		output[variables[0].name] = [];
		return;
	}
	const segments = pathname.split('/');
	for (const variable of variables) {
		if (variable.quantifier) {
			output[variable.name] = segments.slice(variable.index).map(decodeURIComponent);
		} else {
			output[variable.name] = decodeURIComponent(segments[variable.index] || '');
		}
	}
}
