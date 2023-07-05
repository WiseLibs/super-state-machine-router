'use strict';
const ENCODED_CHAR = /[^a-zA-Z0-9/_.!~*'()-]/;

module.exports = (routes) => {
	const regexes = new Array(routes.length);
	for (let i = 0; i < routes.length; ++i) {
		const pattern = routes[i].split('/').map(segmentToRegex).join('/');
		regexes[i] = new RegExp(`^${pattern}$`);
	}

	return (url, outVariables = null) => {
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

		for (let i = 0; i < regexes.length; ++i) {
			const match = pathname.match(regexes[i]);
			if (match) {
				if (outVariables !== null && match.groups) {
					Object.assign(outVariables, match.groups);
				}
				return routes[i];
			}
		}
	};
};

function segmentToRegex(segment) {
	const wildcard = segment.match(/^\{([^}]+)}$/);
	if (wildcard) {
		return `(?<${wildcard[1]}>[^/]+)`;
	}
	return escapeRegex(segment);
}

function escapeRegex(str) {
	return str.replace(/[^A-Za-z0-9_]/g, '\\$&');
}

function normalizePathname(pathname) {
	return pathname.split('/')
		.map(decodeURIComponent)
		.map(encodeURIComponent)
		.join('/');
}
