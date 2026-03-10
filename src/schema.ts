import type { DBAdapterSchemaCreation } from "better-auth";
import type { BetterAuthDBSchema } from "better-auth/db";
import { toSurrealType } from "./utils";

export const createSchema = async ({
	tables,
	file,
}: {
	file?: string | undefined;
	tables: BetterAuthDBSchema;
}): Promise<DBAdapterSchemaCreation> => {
	const queries: string[] = [];
	const resolveModelName = (model: string) => tables[model]?.modelName ?? model;

	for (const table of Object.values(tables)) {
		const tableName = table.modelName;
		queries.push(`DEFINE TABLE IF NOT EXISTS ${tableName} SCHEMAFULL;`);

		for (const [key, field] of Object.entries(table.fields)) {
			const dbField = field.fieldName ?? key;
			const surrealType = toSurrealType(
				field.type,
				field.required ?? true,
				field.references,
				resolveModelName,
			);

			let line = `DEFINE FIELD IF NOT EXISTS ${dbField} ON ${tableName} TYPE ${surrealType}`;
			if (dbField === "email" && surrealType === "string") {
				line += ` ASSERT string::is_email($value)`;
			}
			// FLEXIBLE lets SurrealDB accept arbitrary nested keys on object fields
			if (surrealType === "object") {
				line += ` FLEXIBLE`;
			}
			queries.push(`${line};`);

			if (field.unique) {
				queries.push(
					`DEFINE INDEX IF NOT EXISTS ${tableName}_${dbField}_unique ON ${tableName} FIELDS ${dbField} UNIQUE;`,
				);
			} else if (field.index) {
				queries.push(
					`DEFINE INDEX IF NOT EXISTS ${tableName}_${dbField}_index ON ${tableName} FIELDS ${dbField};`,
				);
			}
		}

		queries.push("");
	}

	return {
		code: queries.join("\n"),
		path: file ?? "schema.surql",
	};
};
