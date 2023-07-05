'use strict';
const path = require('path');
const { execFileSync } = require('child_process');

process.chdir(__dirname);

for (const scriptName of ['naive-regex', 'ssmr', 'ssmr-no-csr']) {
	for (const routeCount of [10, 100, 1000, 10000]) {
		const benchmarkName = `${scriptName.padEnd(11)} (${routeCount} routes)`;
		const scriptPath = path.join(__dirname, 'implementations', scriptName);
		try {
			const result = execFileSync('node', ['benchmark', scriptPath, routeCount], { stdio: 'pipe', encoding: 'utf8' });
			console.log(`${benchmarkName.padEnd(26)}: ${result}`);
		} catch (err) {
			console.log(`${benchmarkName.padEnd(26)}: ERROR`);
			console.log(err.stderr);
		}
	}
}
