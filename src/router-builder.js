'use strict';
const Router = require('./router');
const Machine = require('./machine');
const CSRMachine = require('./csr-machine');
const generateStates = require('./generate-states');
const parseRoute = require('./parse-route');

/*
	A simple builder class for constructing routers from any number of route
	definitions. The routes are assigned incrementing IDs, starting from 0.
 */

module.exports = class RouterBuilder {
	constructor() {
		this._routes = [];
	}

	route(definition, value) {
		this._routes.push({
			...parseRoute(definition),
			id: this._routes.length,
			value,
		});
		return this;
	}

	routeLiteral(definition, value) {
		this._routes.push({
			...parseRoute(definition, true),
			id: this._routes.length,
			value,
		});
		return this;
	}

	build({ compress = false } = {}) {
		const states = generateStates(this._routes);
		const machine = compress
			? CSRMachine.build(states, this._routes.length)
			: Machine.build(states, this._routes.length);

		return new Router({
			_compressed: !!compress,
			_machine: machine,
			_routes: this._routes.map((route) => {
				let variables = null;
				if (route.segments.some(x => typeof x !== 'string')) {
					variables = route.segments.map(x => typeof x === 'string' ? null : x);
				}
				return {
					value: route.value,
					variables,
				};
			}),
		});
	}
};
