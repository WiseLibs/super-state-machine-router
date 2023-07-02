'use strict';
const path = require('path');
const { execFileSync } = require('child_process');

process.chdir(__dirname);

for (const scriptName of ['naive-regex', 'super-router', 'super-router-csr']) {
	for (const routeCount of [10, 100, 1000, 10000]) {
		const benchmarkName = `${scriptName.padEnd(16)} (${routeCount} routes)`;
		const scriptPath = path.join(__dirname, 'implementations', scriptName);
		try {
			const result = execFileSync('node', ['benchmark', scriptPath, routeCount], { stdio: 'pipe', encoding: 'utf8' });
			console.log(`${benchmarkName.padEnd(31)}: ${result}`);
		} catch (err) {
			console.log(`${benchmarkName.padEnd(31)}: ERROR`);
			console.log(err.stderr);
		}
	}
}