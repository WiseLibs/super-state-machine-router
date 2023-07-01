'use strict';
const FORWARD_SLASH = 0x2f;
const ALPHABET = new Uint8Array(0x7e - 0x21 + 1)
	.map((_, i) => 0x21 + i)
	.filter(charCode => charCode !== FORWARD_SLASH);

/*
	Given an array of routes, this generates an array of states. The states
	represent a state machine that can match ASCII input strings to routes.
	Assumptions about the state machine's input include:
		- It is an ASCII string
		- It has no ASCII code points below 0x21 or above 0x7e
		- It may have percent-encodings which represent arbitrary unicode

	The generated states are assigned incrementing IDs, starting from 0.
 */

module.exports = (routes) => {
	const items = new Map();
	const states = new Map();

	stateOf(new Set(routes.map(route => itemOf(route, 0, 0))));

	return [...states.values()];

	function itemOf(route, segment, index) {
		const itemKey = `${route.id},${segment},${index}`;
		let item = items.get(itemKey);
		if (item) return item;
		item = { route, segment, index, key: itemKey };
		items.set(itemKey, item);
		return item;
	}

	function stateOf(itemSet) {
		const stateKey = serializeItemSet(itemSet);
		let state = states.get(stateKey);
		if (state) return state;
		state = { id: states.size, matches: [], transitions: [] };
		states.set(stateKey, state);
		buildState(state, itemSet);
		return state;
	}

	function buildState(state, itemSet) {
		const itemsByCharCode = new Map();
		const matches = new Set();

		function transition(charCode, childItem) {
			let childItems = itemsByCharCode.get(charCode);
			if (!childItems) itemsByCharCode.set(charCode, childItems = new Set());
			childItems.add(childItem);
		}

		for (const item of itemSet) {
			const { route } = item;
			const { segments } = route;
			const segment = segments[item.segment];

			if (typeof segment === 'string') {
				if (item.index < segment.length) {
					const charCode = segment.charCodeAt(item.index);
					transition(charCode, itemOf(route, item.segment, item.index + 1));
				} else if (item.segment < segments.length - 1) {
					transition(FORWARD_SLASH, itemOf(route, item.segment + 1, 0));
					if (segments[item.segment + 1]?.quantifier === '*') {
						matches.add(route);
					}
				} else {
					matches.add(route);
				}
			} else {
				if (item.index === 0) {
					const childItem = itemOf(route, item.segment, 1);
					for (const charCode of ALPHABET) {
						transition(charCode, childItem);
					}
				} else {
					for (const charCode of ALPHABET) {
						transition(charCode, item);
					}
					if (item.segment < segments.length - 1) {
						transition(FORWARD_SLASH, itemOf(route, item.segment + 1, 0));
						if (segments[item.segment + 1]?.quantifier === '*') {
							matches.add(route);
						}
					} else {
						matches.add(route);
						if (segment.quantifier) {
							transition(FORWARD_SLASH, itemOf(route, item.segment, 0));
						}
					}
				}
			}
		}

		for (const [charCode, childItems] of itemsByCharCode) {
			state.transitions.push({ charCode, childState: stateOf(childItems) });
		}
		state.matches.push(...matches);
	}
};

function serializeItemSet(itemSet) {
	const keys = [];
	for (const item of itemSet) {
		keys.push(item.key);
	}
	return keys.sort().join('|');
}
