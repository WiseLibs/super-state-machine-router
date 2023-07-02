'use strict';
const { RouterBuilder } = require('../../.');

module.exports = (routes) => {
	const builder = new RouterBuilder();
	for (const route of routes) {
		builder.add(route, route);
	}
	const router = builder.build({ compress: true });
	return router.route.bind(router);
};
