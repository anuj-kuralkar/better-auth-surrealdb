import type {
	AdapterFactoryCustomizeAdapterCreator,
	CustomAdapter,
} from "better-auth/adapters";
import {
	raw,
	type Surreal,
	type SurrealTransaction,
	surql,
	Table,
} from "surrealdb";
import { type SafeRecord, UNSELECTED_FIELD } from "./types";
import { buildWhere } from "./utils";

type Client = Surreal | SurrealTransaction;

export const buildAdapterMethods = (
	client: Client,
	{
		getFieldName,
		getFieldAttributes,
	}: Parameters<AdapterFactoryCustomizeAdapterCreator>[0],
): Omit<CustomAdapter, "createSchema"> => ({
	create: async ({ model, data }) => {
		const table = new Table(model);
		const [result] = await client.query<[SafeRecord]>(
			surql`CREATE ONLY ${table} CONTENT ${data}`,
		);
		return result as any;
	},

	findOne: async ({ model, where }) => {
		const table = new Table(model);
		const query = surql`SELECT * FROM ONLY ${table}`.append(buildWhere(where));
		const [result] = await client.query<[SafeRecord]>(query);
		return result as any;
	},

	findMany: async ({ model, where, limit, offset, sortBy, select }) => {
		const table = new Table(model);

		const selectedFields =
			select?.map((field) =>
				getFieldName({
					model,
					field,
				}),
			) ?? [];
		const selection =
			selectedFields.length > 0 ? raw(selectedFields.join(", ")) : raw("*");

		const query = surql`SELECT ${selection} FROM ${table}`.append(
			buildWhere(where ?? []),
		);

		if (sortBy) {
			const sortField = getFieldName({
				model,
				field: sortBy.field,
			});

			const attrs = getFieldAttributes({ model, field: sortBy.field });
			const numeric = attrs?.type === "number" ? "NUMERIC" : "";

			query.append(
				` ORDER BY ${sortField} ${numeric} ${sortBy.direction.toUpperCase()}`,
			);
		}

		if (typeof offset === "number") {
			query.append(` START ${offset}`);
		}

		let result = (await client.query<[SafeRecord[]]>(query).collect())[0] ?? [];

		if (typeof limit === "number") {
			result = result.slice(0, limit);
		}

		// Proxy makes unselected fields return UNSELECTED_FIELD instead of
		// undefined, so better-auth's join logic can tell them apart from nulls.
		if (select?.length) {
			result = result.map((row) => {
				return new Proxy(row, {
					get(target, prop) {
						if (typeof prop === "string" && !(prop in target)) {
							return UNSELECTED_FIELD;
						}
						return target[prop as keyof typeof target];
					},
				});
			});
		}

		return result as any;
	},

	update: async ({ model, where, update }) => {
		const table = new Table(model);
		const query = surql`UPDATE ONLY ${table} MERGE ${update}`.append(
			buildWhere(where),
		);
		const [result] = await client.query<[SafeRecord]>(query);
		return result as any;
	},

	updateMany: async ({ model, where, update }) => {
		const table = new Table(model);
		const query = surql`UPDATE ${table} MERGE ${update}`.append(
			buildWhere(where),
		);
		const [result] = await client.query<[SafeRecord[]]>(query);
		return result.length;
	},

	delete: async ({ model, where }) => {
		const table = new Table(model);
		await client.query(surql`DELETE FROM ${table}`.append(buildWhere(where)));
	},

	deleteMany: async ({ model, where }) => {
		const table = new Table(model);
		const query = surql`DELETE FROM ${table}`.append(buildWhere(where));
		const [result] = await client.query<[SafeRecord[]]>(query);
		return result.length;
	},

	count: async ({ model, where }) => {
		const table = new Table(model);
		const query = surql`SELECT count() FROM ${table}`
			.append(buildWhere(where ?? []))
			.append(surql` GROUP ALL`);
		const [result] = await client.query<[Array<{ count: number }>]>(query);
		return result[0]?.count;
	},
});
