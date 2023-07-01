'use strict';
const STATE_SIZE = 0x7e - 0x21 + 2;
const INPUT_OFFSET = -0x21 + 1;

/*
	This builds a runnable state machine, given an array of states. Each state
	is encoded as 95 bytes, where the first byte of each state encodes the
	matching route (if any), and the remaining 94 bytes encode transitions on
	each possible input character. If a transition's next state is out of bounds
	or if a state's matching route is out of bounds, it indicates that no match
	was found.
 */

exports.build = (states, routeCount) => {
	const maxValue = Math.max(routeCount, states.length);
	const TypedArray
		= maxValue < 256 ? Uint8Array
		: maxValue < 65536 ? Uint16Array
		: maxValue < 0x7fffffff ? Uint32Array
		: undefined;

	if (!TypedArray) {
		throw new RangeError('Too many routes (router state machine is too big)');
	}

	const stateMachine = new TypedArray(STATE_SIZE * states.length).fill(states.length);
	for (const state of states) {
		const offset = state.id * STATE_SIZE;

		if (state.matches.length) {
			const routeId = state.matches[0].id;
			if (state.matches.some(route => route.id !== routeId)) {
				const err = new Error('Route conflicts detected');
				err.conflicts = state.matches.map(route => route.source);
				throw err;
			}
			stateMachine[offset] = routeId;
		} else {
			stateMachine[offset] = routeCount;
		}

		for (const { charCode, childState } of state.transitions) {
			const slot = charCode + INPUT_OFFSET;
			stateMachine[offset + slot] = childState.id;
		}
	}

	return {
		stateMachine,
		stateCount: states.length,
	};
};

/*
	This runs a state machine against an array of ASCII code points (integers)
	and returns the ID of the matching route. If the returned ID is out of
	bounds, no match was found. We assume the first input character is "/",
	which is simply ignored.
 */

exports.run = ({ stateMachine, stateCount }, input) => {
	let state = 0;
	for (let index = 1; index < input.length; ++index) {
		const slot = input[index] + INPUT_OFFSET;
		state = stateMachine[state * STATE_SIZE + slot];
		if (state >= stateCount) return 0x7fffffff;
	}
	return stateMachine[state * STATE_SIZE];
};
