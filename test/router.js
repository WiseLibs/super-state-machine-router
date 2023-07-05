'use strict';
const { expect } = require('chai');
const { RouterBuilder } = require('..');

describe('Router', function () {
	for (const [testSuiteTitle, compress] of [['compressed', true], ['uncompressed', false]]) {
		describe(testSuiteTitle, function () {
			const router = new RouterBuilder()
				.add('/', 1)
				.add('/foo', 2)
				.add('/foo/bar', 3)
				.add('/foo/bar/baz', 4)
				.add('/{var1}/BAR/{var2}', 5)
				.add('/x/a/{optionalPath}*', 6)
				.add('/x/b/{requiredPath}+', 7)
				.addLiteral('/x/%62/{requiredPath}+', 8)
				.add('/mailto:foobarbaz', 'invalid')
				.add('/mailto:oobarbaz', 'invalid')
				.add('/foobarbaz', 'invalid')
				.add('/oobarbaz', 'invalid')
				.add('/enc%6Fded&', 9)
				.add('/%00weird%2f', 10)
				.build({ compress });

			it('throws if the url is not a string or URL object', function () {
				expect(() => router.route()).to.throw(TypeError);
				expect(() => router.route(null)).to.throw(TypeError);
				expect(() => router.route(123)).to.throw(TypeError);
				expect(() => router.route({})).to.throw(TypeError);
				expect(() => router.route([])).to.throw(TypeError);
				expect(() => router.route(new String('/'))).to.throw(TypeError);
				expect(() => router.route({ pathname: '/' })).to.throw(TypeError);
			});
			it('returns the value of the matching route', function () {
				expect(router.route('/')).to.equal(1);
				expect(router.route('/foo')).to.equal(2);
				expect(router.route(new URL('http://test/foo/bar'))).to.equal(3);
				expect(router.route(new URL('http://test/foo/bar/baz?lol'))).to.equal(4);
			});
			it('returns undefined if there is no matching route', function () {
				expect(router.route('/FOO')).to.equal(undefined);
				expect(router.route('/foo/barz')).to.equal(undefined);
				expect(router.route(new URL('http://test/foo/barz'))).to.equal(undefined);
			});
			it('never matches opaque paths', function () {
				expect(router.route('mailto:foobarbaz')).to.equal(undefined);
				expect(router.route(new URL('mailto:foobarbaz'))).to.equal(undefined);
			});
			it('never matches empty segments or trailing slashes', function () {
				expect(router.route('/foo/')).to.equal(undefined);
				expect(router.route('/foo/bar/baz/')).to.equal(undefined);
				expect(router.route('/foo//bar/baz')).to.equal(undefined);
				expect(router.route(new URL('http://test//foo/bar/baz'))).to.equal(undefined);
				expect(router.route(new URL('http://test//'))).to.equal(undefined);
				expect(router.route(new URL('http://test//BAR/'))).to.equal(undefined);
				expect(router.route(new URL('http://test//BAR/x'))).to.equal(undefined);
				expect(router.route(new URL('http://test/x/BAR/'))).to.equal(undefined);
			});
			it('normalizes percent-encodings in the input', function () {
				expect(router.route('/fo%6f')).to.equal(2);
				expect(router.route('/fo%6F')).to.equal(2);
				expect(router.route('/enc%6fded&')).to.equal(9);
				expect(router.route('/enc%6fded%26')).to.equal(9);
				expect(router.route('/encoded%26')).to.equal(9);
				expect(router.route('/encoded&')).to.equal(9);
				expect(router.route('/%00weird%2f')).to.equal(10);
				expect(router.route('/\x00weird%2f')).to.equal(10);
				expect(router.route('/\x00weird/')).to.equal(undefined);
			});
			it('matches one or more characters on variable segments', function () {
				expect(router.route('/123/BAR/456')).to.equal(5);
				expect(router.route('/1/BAR/23')).to.equal(5);
				expect(router.route('//BAR/23')).to.equal(undefined);
				expect(router.route('/1/BAR/')).to.equal(undefined);
			});
			it('matches multiple non-empty segments on quantified variable segments', function () {
				expect(router.route('/x/a/123/456')).to.equal(6);
				expect(router.route('/x/a/1/2/3/4/5/6')).to.equal(6);
				expect(router.route('/x/a/0')).to.equal(6);
				expect(router.route('/x/a/')).to.equal(undefined);
				expect(router.route('/x/a/1/')).to.equal(undefined);
				expect(router.route('/x/a/1//2')).to.equal(undefined);
				expect(router.route('/x/a/1/2//3')).to.equal(undefined);
				expect(router.route('/x/a/1/2/3/')).to.equal(undefined);
				expect(router.route('/x/a//1/2')).to.equal(undefined);
				expect(router.route('/x/b/123/456')).to.equal(7);
				expect(router.route('/x/b/1/2/3/4/5/6')).to.equal(7);
				expect(router.route('/x/b/0')).to.equal(7);
				expect(router.route('/x/b/')).to.equal(undefined);
				expect(router.route('/x/b/1/')).to.equal(undefined);
				expect(router.route('/x/b/1//2')).to.equal(undefined);
				expect(router.route('/x/b/1/2//3')).to.equal(undefined);
				expect(router.route('/x/b/1/2/3/')).to.equal(undefined);
				expect(router.route('/x/b//1/2')).to.equal(undefined);

				const router2 = new RouterBuilder().add('/{var}*', -1).build();
				expect(router2.route('/1')).to.equal(-1);
				expect(router2.route('/1/2')).to.equal(-1);
				expect(router2.route('/1/')).to.equal(undefined);
				expect(router2.route('/1//2')).to.equal(undefined);
				expect(router2.route(new URL('http://test//'))).to.equal(undefined);
				expect(router2.route(new URL('http://test//1'))).to.equal(undefined);
			});
			it('allows a "*" variable segment to be omitted', function () {
				expect(router.route('/x/a')).to.equal(6);

				const router2 = new RouterBuilder().add('/{var}*', -1).build();
				expect(router2.route('/1')).to.equal(-1);
				expect(router2.route('/1/2/3')).to.equal(-1);
				expect(router2.route('/')).to.equal(-1);
				expect(router2.route('/1/')).to.equal(undefined);
				expect(router2.route('/1//2')).to.equal(undefined);
				expect(router2.route(new URL('http://test//'))).to.equal(undefined);
				expect(router2.route(new URL('http://test//1'))).to.equal(undefined);
			});
			it('does not allow a "+" variable segment to be omitted', function () {
				expect(router.route('/x/b')).to.equal(undefined);

				const router2 = new RouterBuilder().add('/{var}+', -1).build();
				expect(router2.route('/1')).to.equal(-1);
				expect(router2.route('/1/2/3')).to.equal(-1);
				expect(router2.route('/')).to.equal(undefined);
				expect(router2.route('/1/')).to.equal(undefined);
				expect(router2.route('/1//2')).to.equal(undefined);
				expect(router2.route(new URL('http://test//'))).to.equal(undefined);
				expect(router2.route(new URL('http://test//1'))).to.equal(undefined);
			});
			it('provides variable values if requested', function () {
				let vars = {};
				expect(router.route('/123/BAR/456', vars)).to.equal(5);
				expect(vars).to.deep.equal({ var1: '123', var2: '456' });

				vars = {};
				expect(router.route('/1/BAR/23', vars)).to.equal(5);
				expect(vars).to.deep.equal({ var1: '1', var2: '23' });

				vars = {};
				expect(router.route('//BAR/23', vars)).to.equal(undefined);
				expect(vars).to.deep.equal({});
			});
			it('provides an array of values for quantified variables', function () {
				let vars = {};
				expect(router.route('/x/a/123', vars)).to.equal(6);
				expect(vars).to.deep.equal({ optionalPath: ['123'] });

				vars = {};
				expect(router.route('/x/a/123/456/789', vars)).to.equal(6);
				expect(vars).to.deep.equal({ optionalPath: ['123', '456', '789'] });

				vars = {};
				expect(router.route('/x/a', vars)).to.equal(6);
				expect(vars).to.deep.equal({ optionalPath: [] });

				vars = {};
				expect(router.route('/x/b/123', vars)).to.equal(7);
				expect(vars).to.deep.equal({ requiredPath: ['123'] });

				vars = {};
				expect(router.route('/x/b/123/456/789', vars)).to.equal(7);
				expect(vars).to.deep.equal({ requiredPath: ['123', '456', '789'] });

				vars = {};
				const router2 = new RouterBuilder().add('/{foobar}*', -1).build();
				expect(router2.route('/', vars)).to.equal(-1);
				expect(vars).to.deep.equal({ foobar: [] });
			});
			it('treats special characters literally in literal routes', function () {
				expect(router.route('/x/%2562/%7BrequiredPath%7D%2B')).to.equal(8);
				expect(router.route('/x/%2562/%7BrequiredPath%7D+')).to.equal(8);
			});
		});
	}
});
