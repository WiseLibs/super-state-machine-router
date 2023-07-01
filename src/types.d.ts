declare namespace SuperRouter {
	export class RouterBuilder<T = any> {
		add(definition: string, value: T): this;
		addLiteral(definition: string, value: T): this;
		build(options?: BuildOptions): Router<T>;
	}

	export class Router<T = any> {
		constructor(clone: Router<T>);
		route(
			url: string | URL,
			outVariables?: object | null
		): T | undefined;
	}

	export interface BuildOptions {
		compress?: boolean;
	}
}

export = SuperRouter;
