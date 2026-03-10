import { testAdapter } from "@better-auth/test-utils/adapter";
import { createNodeEngines } from "@surrealdb/node";
import { getAuthTables } from "better-auth";
import { createRemoteEngines, Surreal } from "surrealdb";

import { surrealDBAdapter } from "../src";
import { createSchema } from "../src/schema";
import {
	authFlowTestSuite,
	normalTestSuite,
	transactionsTestSuite,
} from "./suits";

const db = new Surreal({
	engines: {
		...createRemoteEngines(),
		...createNodeEngines(),
	},
});

const { execute } = await testAdapter({
	adapter: async (options) => {
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

	tests: [normalTestSuite(), authFlowTestSuite(), transactionsTestSuite()],

	async onFinish() {
		await db.close();
	},
});

execute();
