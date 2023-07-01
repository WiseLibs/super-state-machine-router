'use strict';
const SEGMENT = /[^/]*/y;

/*
	Parses a route definition. Route definitions are URL pathnames which:
		- Must start with a "/"
		- Must not contain trailing slashes or empty segments
		- May include percent-encodings

	Any segment may be defined as "{someVariable}", which matches any non-empty
	string. The matched string will be available via the name given inside the
	brackets.

	If the last segment is defined as a variable, it may be suffixed with "+" or
	"*", which causes it to match any number of additional non-empty segments.
	The "*" suffix also indicates that the last segment may be omitted entirely.
	If one of these suffixes is used, the associated variable will be an array
	of all remaining segments. In the case of "*", the array may be empty.

	If `isLiteral` is true, each segment of the definition is interpreted
	literally, which means variables are not allowed and percent-encodings are
	treated as literal "%" characters.
 */

module.exports = (definition, isLiteral = false) => {
	if (typeof definition !== 'string') {
		throw new TypeError('Expected route definition to be a string');
	}
	if (!definition.startsWith('/')) {
		throw failure('Routes must start with "/"', definition, 0);
	}
	if (definition === '/') {
		return {
			segments: [''],
			source: definition,
		};
	}
	if (definition.endsWith('/')) {
		throw failure('Routes with trailing "/" not supported', definition, definition.length - 1);
	}

	const segments = [];
	SEGMENT.lastIndex = 1;

	let match;
	while (match = SEGMENT.exec(definition)) {
		const segment = match[0];
		if (!segment) {
			throw failure('Routes with empty segments not supported', definition, match.index - 1);
		}
		if (isLiteral) {
			segments.push(encodeURIComponent(segment));
		} else if (!segment.startsWith('{')) {
			const index = segment.indexOf('{');
			if (index >= 0) {
				throw failure('Route contains illegal token "{"', definition, match.index + index);
			}
			segments.push(normalizeSegment(segment, definition));
		} else {
			const index = segment.indexOf('}', 1);
			if (index < 0) {
				throw failure('Route variable is missing a matching "}"', definition, match.index);
			}
			const tail = segment.charAt(index + 1);
			if (tail !== '' && tail !== '*' && tail !== '+') {
				throw failure(`Route contains illegal token "${tail}"`, definition, match.index + index + 1);
			}
			segments.push({
				name: segment.slice(1, -1 - tail.length),
				quantifier: tail,
			});
		}
		SEGMENT.lastIndex += 1;
	}

	return {
		segments,
		source: definition,
	};
};

function normalizeSegment(segment, source) {
	try {
		return encodeURIComponent(decodeURIComponent(segment));
	} catch (_) {
		throw failure('Route contains malformed percent-encodings', source, 0);
	}
}

function failure(message, source, offset) {
	const err = new Error(message);
	err.source = source;
	err.offset = offset;
	return err;
}
