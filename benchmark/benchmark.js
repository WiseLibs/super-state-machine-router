'use strict';
const benchmark = require('nodemark');
const [scriptPath, routeCount] = process.argv.slice(2);
process.on('unhandledRejection', (err) => { throw err; });

function getRoutes() {
	const staticRouteCount = Math.ceil(routeCount * 0.8);
	const dynamicRouteCount = Math.floor(routeCount * 0.2);
	const staticRoutes = require('./data/static.json').slice(0, staticRouteCount);
	const dynamicRoutes = require('./data/dynamic.json').slice(0, dynamicRouteCount);
	return staticRoutes.concat(dynamicRoutes);
}

let route;
let url;
function prepareURL() {
	route = routes[Math.floor(Math.random() * routes.length)];
	url = new URL(route.replace(/[{}]/g, 'a'), 'https://_');
}

function matchURL() {
	if (implementation(url) !== route) {
		throw new Error(`Incorrect match result for: ${route}`);
	}
}

const routes = getRoutes();
const implementation = require(scriptPath)(routes);
process.stdout.write(benchmark(matchURL, prepareURL, 5000).toString());
