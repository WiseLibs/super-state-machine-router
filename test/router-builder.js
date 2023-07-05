'use strict';
const { expect } = require('chai');
const { RouterBuilder, Router } = require('..');

describe('RouterBuilder', function () {
	describe('add()', function () {
		it('throws if the definition is not a string', function () {
			const builder = new RouterBuilder();
			expect(() => builder.add()).to.throw(TypeError);
			expect(() => builder.add(null)).to.throw(TypeError);
			expect(() => builder.add(100)).to.throw(TypeError);
			expect(() => builder.add(new String('/'))).to.throw(TypeError);
			expect(() => builder.add(new URL('https://foo/'))).to.throw(TypeError);
		});
		it('throws if the definition does not start with "/"', function () {
			const builder = new RouterBuilder();
			expect(() => builder.add('foo')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('foo/')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('\\')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('https://foo/')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('mailto:foo@bar.com')).to.throw(Error).with.keys(['source', 'offset']);
		});
		it('throws if the definition has trailing slashes', function () {
			const builder = new RouterBuilder();
			expect(() => builder.add('/foo/')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/foo///')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('//')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('///')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/foo/bar/')).to.throw(Error).with.keys(['source', 'offset']);
		});
		it('throws if the definition has empty segments', function () {
			const builder = new RouterBuilder();
			expect(() => builder.add('/foo//bar')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/foo/bar//baz')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('//foo/bar')).to.throw(Error).with.keys(['source', 'offset']);
		});
		it('throws if the definition has malformed percent-encodings', function () {
			const builder = new RouterBuilder();
			expect(() => builder.add('/foo/bar%PP')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/foo/bar%FG')).to.throw(Error).with.keys(['source', 'offset']);
		});
		it('throws if the definition has "{" without a matching "}"', function () {
			const builder = new RouterBuilder();
			expect(() => builder.add('/foo/{bar')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo/}bar')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo/bar}')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo%7D/bar')).to.throw(Error).with.keys(['source', 'offset']);
		});
		it('throws if the definition has illegal "{" tokens', function () {
			const builder = new RouterBuilder();
			expect(() => builder.add('/foo{bar}/baz')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/foo{}/bar')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/foo{bar}/baz')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/foo/bar{baz}qux')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/foo/bar{')).to.throw(Error).with.keys(['source', 'offset']);
		});
		it('throws if the definition has a variable with an invalid tail', function () {
			const builder = new RouterBuilder();
			expect(() => builder.add('/{foo}?')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo}+*')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo}*+')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo}*?')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo}+?')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo}+xyz')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo}x')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo}xyz')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo} ')).to.throw(Error).with.keys(['source', 'offset']);
		});
		it('throws if the definition has a quantified variable before the ending', function () {
			const builder = new RouterBuilder();
			expect(() => builder.add('/{foo}+/bar')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo}+/{bar}')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo}*/bar')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo}*/{bar}')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo}*/x')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo}*/')).to.throw(Error).with.keys(['source', 'offset']);
		});
		it('throws if the definition has a duplicate variable name', function () {
			const builder = new RouterBuilder();
			expect(() => builder.add('/{foo}/{foo}')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.add('/{foo}/{bar}/{foo}')).to.throw(Error).with.keys(['source', 'offset']);
		});
		it('allows a definition of "/"', function () {
			const builder = new RouterBuilder();
			builder.add('/');
		});
		it('allows any number of segments', function () {
			const builder = new RouterBuilder();
			builder.add('/foo/bar/baz/qux/1/2/3/4/5/6/7/8/9');
		});
		it('allows valid percent-encodings', function () {
			const builder = new RouterBuilder();
			builder.add('/f%6F%6F/bar%2Fbaz/qux%3F1/2/3/4/5/6/7/8/9');
			builder.add('/foo%00/bar');
		});
		it('allows variable segments', function () {
			const builder = new RouterBuilder();
			builder.add('/{foo}/bar');
			builder.add('/foo/{bar}/{baz}');
			builder.add('/{foo}/{bar}/baz/{qux}');
			builder.add('/{foo}/{bar}/baz/{qux}/1/2/3');
		});
		it('allows a quantified variable as the last segment', function () {
			const builder = new RouterBuilder();
			builder.add('/{foo}+');
			builder.add('/{foo}*');
			builder.add('/foo/{bar}/{baz}+');
			builder.add('/{foo}/bar/{baz}*');
		});
	});
	describe('addLiteral()', function () {
		it('throws if the definition is not a string', function () {
			const builder = new RouterBuilder();
			expect(() => builder.addLiteral()).to.throw(TypeError);
			expect(() => builder.addLiteral(null)).to.throw(TypeError);
			expect(() => builder.addLiteral(100)).to.throw(TypeError);
			expect(() => builder.addLiteral(new String('/'))).to.throw(TypeError);
			expect(() => builder.addLiteral(new URL('https://foo/'))).to.throw(TypeError);
		});
		it('throws if the definition does not start with "/"', function () {
			const builder = new RouterBuilder();
			expect(() => builder.addLiteral('foo')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.addLiteral('foo/')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.addLiteral('\\')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.addLiteral('https://foo/')).to.throw(Error).with.keys(['source', 'offset']);
		});
		it('throws if the definition has trailing slashes', function () {
			const builder = new RouterBuilder();
			expect(() => builder.addLiteral('/foo/')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.addLiteral('/foo///')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.addLiteral('//')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.addLiteral('///')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.addLiteral('/foo/bar/')).to.throw(Error).with.keys(['source', 'offset']);
		});
		it('throws if the definition has empty segments', function () {
			const builder = new RouterBuilder();
			expect(() => builder.addLiteral('/foo//bar')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.addLiteral('/foo/bar//baz')).to.throw(Error).with.keys(['source', 'offset']);
			expect(() => builder.addLiteral('//foo/bar')).to.throw(Error).with.keys(['source', 'offset']);
		});
		it('allows a definition of "/"', function () {
			const builder = new RouterBuilder();
			builder.addLiteral('/');
		});
		it('allows any number of segments', function () {
			const builder = new RouterBuilder();
			builder.addLiteral('/foo/bar/baz/qux/1/2/3/4/5/6/7/8/9');
		});
		it('treats special characters literally', function () {
			expect(new RouterBuilder().addLiteral('/{foo}')._routes[0].segments)
				.to.deep.equal(['%7Bfoo%7D']);
			expect(new RouterBuilder().addLiteral('/{foo}+')._routes[0].segments)
				.to.deep.equal(['%7Bfoo%7D%2B']);
			expect(new RouterBuilder().addLiteral('/{foo}*')._routes[0].segments)
				.to.deep.equal(['%7Bfoo%7D*']);
			expect(new RouterBuilder().addLiteral('/foo{bar}')._routes[0].segments)
				.to.deep.equal(['foo%7Bbar%7D']);
			expect(new RouterBuilder().addLiteral('/{foo}/{foo}')._routes[0].segments)
				.to.deep.equal(['%7Bfoo%7D', '%7Bfoo%7D']);
			expect(new RouterBuilder().addLiteral('/%6F%00%2F%3F')._routes[0].segments)
				.to.deep.equal(['%256F%2500%252F%253F']);
			expect(new RouterBuilder().addLiteral('/foo%pp')._routes[0].segments)
				.to.deep.equal(['foo%25pp']);
			expect(new RouterBuilder().addLiteral('/foo%2Fbar')._routes[0].segments)
				.to.deep.equal(['foo%252Fbar']);
		});
	});
	describe('build()', function () {
		it('throws if conflicting routes were added', function () {
			expect(() => new RouterBuilder()
				.add('/foo/bar')
				.addLiteral('/foo/bar')
				.build()
			).to.throw(Error).with.keys(['conflicts']);
			expect(() => new RouterBuilder()
				.addLiteral('/foo/bar')
				.add('/foo/{something}')
				.build()
			).to.throw(Error).with.keys(['conflicts']);
			expect(() => new RouterBuilder()
				.addLiteral('/foo/bar')
				.addLiteral('/baz/qux')
				.add('/{something}/{otherthing}')
				.build()
			).to.throw(Error).with.keys(['conflicts']);
			expect(() => new RouterBuilder()
				.addLiteral('/foo/bar/baz/qux')
				.add('/foo/{something}+')
				.build()
			).to.throw(Error).with.keys(['conflicts']);
			expect(() => new RouterBuilder()
				.addLiteral('/foo')
				.add('/foo/{something}*')
				.build()
			).to.throw(Error).with.keys(['conflicts']);
			expect(() => new RouterBuilder()
				.addLiteral('/foo')
				.add('/{something}+')
				.build()
			).to.throw(Error).with.keys(['conflicts']);
			expect(() => new RouterBuilder()
				.addLiteral('/x')
				.add('/{something}*')
				.build()
			).to.throw(Error).with.keys(['conflicts']);
			expect(() => new RouterBuilder()
				.addLiteral('/')
				.add('/{something}*')
				.build()
			).to.throw(Error).with.keys(['conflicts']);
		});
		it('returns a router', function () {
			const builder = new RouterBuilder();
			builder.addLiteral('/');
			builder.addLiteral('/foo/bar/baz/qux/1/2/3/4/5/6/7/8/9');
			builder.add('/foo/bar/baz');
			builder.add('/{foo}/bar/qux');
			builder.add('/foo/baz/{qux}+');
			builder.add('/fooz/{bar}/{baz}/x');
			expect(builder.build()).to.be.an.instanceof(Router);
		});
	});
});
