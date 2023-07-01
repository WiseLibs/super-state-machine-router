'use strict';
const Router = require('./router');
const Machine = require('./machine');
const generateStates = require('./generate-states');
const parseRoute = require('./parse-route');

/*
	A simple builder class for constructing routers from any number of route
	definitions.
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

	build() {
		const states = generateStates(this._routes);
		const stateMachine = Machine.build(states, this._routes.length);

		return new Router({
			_stateMachine: stateMachine,
			_stateCount: states.length,
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
