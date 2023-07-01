'use strict';
const FORWARD_SLASH = 0x2f;
const ALPHABET_SIZE = 0x7e - 0x21;
const WILDCARD = 0xff;

/*
	This builds a runnable state machine using CSR compression, minimizing the
	size of generated tables. The value `rowOffsets[i]` encodes the index in
	`keys` and `values` where state `i` begins. The keys represent transitions
	on ASCII code points, and the values indicate which state to transition to.
	The value `matches[i]` encodes the matching route ID at state `i`. If the
	route ID is out of bounds, it indicates that no match was found.

	Additionally, the special key `0xff` is used to indicate that the state has
	transitions on every possible input character, except "/", and that all such
	transitions lead to the same state. States with this special key may still
	have a transition on "/" to some other state. This optimization/hack is used
	to greatly reduce the memory requirements of states that were generated for
	wildcard/variable segments.
 */

exports.build = (states, routeCount) => {
	const rowOffsets = [];
	const keys = [];
	const values = [];
	const matches = pack(states.length, routeCount).fill(routeCount);

	for (const state of states) {
		rowOffsets.push(values.length);

		if (state.matches.length) {
			const routeId = state.matches[0].id;
			if (state.matches.some(route => route.id !== routeId)) {
				const err = new Error('Route conflicts detected');
				err.conflicts = state.matches.map(route => route.source);
				throw err;
			}
			matches[state.id] = routeId;
		}

		const { transitions } = state;
		const commonChildState = allSameTransitions(transitions);
		if (commonChildState) {
			const slashTransition = transitions.find(isSlashTransition);
			if (slashTransition) {
				keys.push(FORWARD_SLASH);
				values.push(slashTransition.childState.id);
			}
			keys.push(WILDCARD);
			values.push(commonChildState.id);
		} else {
			for (const { charCode, childState } of transitions) {
				keys.push(charCode);
				values.push(childState.id);
			}
		}
	}

	rowOffsets.push(values.length);

	return {
		rowOffsets: pack(rowOffsets, values.length),
		keys: new Uint8Array(keys),
		values: pack(values, states.length - 1),
		matches,
	};
};

function pack(arg, maxValue) {
	const TypedArray
		= maxValue < 256 ? Uint8Array
		: maxValue < 65536 ? Uint16Array
		: maxValue < 0x7fffffff ? Uint32Array
		: undefined;

	if (!TypedArray) {
		throw new RangeError('Too many routes (router state machine is too big)');
	}

	return new TypedArray(arg);
}

function allSameTransitions(transitions) {
	if (transitions.length < ALPHABET_SIZE) {
		return null;
	}
	let count = 0;
	const { childState } = transitions.find(isNotSlashTransition);
	for (const transition of transitions) {
		if (transition.charCode !== FORWARD_SLASH) {
			if (transition.childState !== childState) {
				return null;
			}
			count += 1;
		}
	}
	return count === ALPHABET_SIZE ? childState : null;
}

function isSlashTransition(transition) {
	return transition.charCode === FORWARD_SLASH;
}

function isNotSlashTransition(transition) {
	return transition.charCode !== FORWARD_SLASH;
}

/*
	This runs a CSR-compressed state machine against an array of ASCII code
	points (integers) and returns the ID of the matching route. If the returned
	ID is out of bounds, no match was found. We assume the first input character
	is "/", which is simply ignored. This algorithm is necessarily less
	efficient than a regular/uncompressed state machine, but technically still
	runs in O(n) time, since the size of the input alphabet is constant.
 */

exports.run = ({ rowOffsets, keys, values, matches }, input) => {
	let state = 0;
	read: for (let index = 1; index < input.length; ++index) {
		const charCode = input[index];
		let offset = rowOffsets[state];
		const endOffset = rowOffsets[state + 1];
		if (offset < endOffset) {
			do {
				if (keys[offset] === charCode) {
					state = values[offset];
					continue read;
				}
			} while (++offset < endOffset);
			if (keys[--offset] === WILDCARD && charCode !== FORWARD_SLASH) {
				state = values[offset];
				continue read;
			}
		}
		return 0x7fffffff;
	}
	return matches[state];
};
