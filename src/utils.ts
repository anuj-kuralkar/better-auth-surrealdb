import type { CleanedWhere } from "better-auth/adapters";
import {
	contains,
	DateTime,
	eq,
	expr,
	gt,
	gte,
	inside,
	lt,
	lte,
	ne,
	not,
	RecordId,
	raw,
	StringRecordId,
	surql,
	Uuid,
} from "surrealdb";

import type { DBField } from "./types";

const UUID_LITERAL_REGEX = /^u(["'])(.+)\1$/;

export const stripIdBrackets = (idPart: string): string => {
	while (idPart.startsWith("⟨") && idPart.endsWith("⟩")) {
		idPart = idPart.slice(1, -1);
	}
	return idPart;
};

/**
 * Parse a string record id into a typed `RecordId`.
 * Handles UUID-literal ids (e.g. `u"..."`) transparently.
 *
 * @example
 * ```ts
 * parseRecordId("user:abc")           // RecordId { table: "user", id: "abc" }
 * parseRecordId('user:u"550e8400-…"') // RecordId { table: "user", id: Uuid }
 * ```
 */
export const parseRecordId = (rid: string): RecordId => {
	const canonical = new StringRecordId(rid).toString();
	const separatorIndex = canonical.indexOf(":");
	const table = canonical.slice(0, separatorIndex);
	const idPart = stripIdBrackets(canonical.slice(separatorIndex + 1));

	const uuidMatch = idPart.match(UUID_LITERAL_REGEX);
	if (uuidMatch?.[2]) {
		try {
			return new RecordId(table, new Uuid(uuidMatch[2]));
		} catch {
			// not a valid UUID — treat as plain string id
		}
	}

	return new RecordId(table, idPart);
};

const coerceOneToRecordId = (item: unknown): RecordId | typeof item => {
	if (item instanceof RecordId) return item;
	if (item instanceof StringRecordId) return parseRecordId(item.toString());
	if (typeof item === "string") return parseRecordId(item);
	return item;
};

/** Coerce a value (or array) into `RecordId` instances. No-ops on values that are already `RecordId`. */
export const coerceToRecordId = (data: unknown): unknown => {
	if (Array.isArray(data)) {
		return data.map(coerceOneToRecordId);
	}
	return coerceOneToRecordId(data);
};

const toOneOutputId = (value: string | RecordId | StringRecordId): string => {
	const parsed =
		value instanceof RecordId ? value : parseRecordId(value.toString());
	const canonical = new StringRecordId(parsed).toString();
	const separatorIndex = canonical.indexOf(":");
	const idPart = stripIdBrackets(canonical.slice(separatorIndex + 1));
	return `${parsed.table.name}:${idPart}`;
};

/** Coerce a value (or array) into canonical `table:id` strings. Non-id types pass through unchanged. */
export const coerceToOutputId = (data: unknown): unknown => {
	if (Array.isArray(data)) {
		return data.map((item) => {
			if (
				item instanceof RecordId ||
				item instanceof StringRecordId ||
				typeof item === "string"
			) {
				return toOneOutputId(item);
			}
			return item;
		});
	}
	if (
		data instanceof RecordId ||
		data instanceof StringRecordId ||
		typeof data === "string"
	) {
		return toOneOutputId(data);
	}
	return data;
};

/** Normalise SurrealDB `DateTime` / ISO strings into plain JS `Date` objects. */
export const toDate = (value: unknown): unknown => {
	if (value === null || value === undefined) return value;
	if (value instanceof Date) return value;
	if (value instanceof DateTime) return value.toDate();
	if (typeof value === "string") {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? value : parsed;
	}
	return value;
};

const FIELD_TYPE_MAP: Partial<Record<string, string>> = {
	string: "string",
	number: "float",
	boolean: "bool",
	date: "datetime",
	json: "object",
	"string[]": "array<string>",
	"number[]": "array<float>",
};

/**
 * Map a better-auth field definition to a SurrealQL type string.
 *
 * @returns A SurrealQL type — e.g. `"string"`, `"option<float>"`, `"record<user>"`.
 */
export const toSurrealType = (
	type: DBField,
	required: boolean,
	references?: { model: string; field: string },
	getModelName?: (model: string) => string,
): string => {
	let base: string;

	if (references?.field === "id") {
		base = `record<${getModelName?.(references.model) ?? references.model}>`;
	} else if (Array.isArray(type)) {
		base = "string"; // literal string union → stored as string
	} else {
		base = FIELD_TYPE_MAP[type] ?? "string";
	}

	return required ? base : `option<${base}>`;
};

export const buildWhere = (where: CleanedWhere[]) => {
	if (!where || where.length === 0) return surql``;

	const toClause = (w: CleanedWhere) => {
		const { field, value } = w;
		switch (w.operator) {
			case "eq":
				return expr(eq(field, value));
			case "ne":
				return expr(ne(field, value));
			case "lt":
				return expr(lt(field, value));
			case "lte":
				return expr(lte(field, value));
			case "gt":
				return expr(gt(field, value));
			case "gte":
				return expr(gte(field, value));
			case "contains":
				return expr(contains(field, value));
			case "in":
				return expr(inside(field, value));
			case "not_in":
				return expr(not(inside(field, value)));
			case "starts_with":
				return surql`string::starts_with(${raw(field)}, ${value})`;
			case "ends_with":
				return surql`string::ends_with(${raw(field)}, ${value})`;
		}
	};

	const [first, ...rest] = where;
	return rest.reduce(
		(acc, w) =>
			acc
				.append(w.connector === "AND" ? surql` AND ` : surql` OR `)
				.append(toClause(w)),
		surql` WHERE `.append(toClause(first)),
	);
};
