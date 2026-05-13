import {
	authFlowTestSuite,
	normalTestSuite,
	testAdapter,
	transactionsTestSuite,
} from "@better-auth/test-utils/adapter";
import { createNodeEngines } from "@surrealdb/node";
import { getAuthTables } from "better-auth";
import { createRemoteEngines, Surreal } from "surrealdb";

import { surrealDBAdapter } from "../src";
import { createSchema } from "../src/schema";
import { normalTestSurrealSuite } from "./basic-surreal";

const db = new Surreal({
	engines: {
		...createRemoteEngines(),
		...createNodeEngines(),
	},
});

const { execute } = await testAdapter({
	adapter: async () => {
		return surrealDBAdapter({ db });
	},

	async runMigrations(betterAuthOptions) {
		await db.connect("mem://");
		await db.use({ namespace: "ns", database: "db" });

		const { code } = await createSchema({
			tables: getAuthTables(betterAuthOptions),
		});
		await db.query(code);
	},

	tests: [
		// These tests assume standard string IDs, but SurrealDB uses
		// `table:id` record IDs, so they are covered in `normalTestSurrealSuite`.
		normalTestSuite({
			disableTests: {
				"create - should create a model": true,
				"create - should use generateId if provided": true,
			},
		}),
		normalTestSurrealSuite(),

		authFlowTestSuite(),
		transactionsTestSuite(),
	],

	async onFinish() {
		await db.close();
	},
});

execute();
