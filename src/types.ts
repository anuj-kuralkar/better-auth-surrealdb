import type { DBAdapterDebugLogOption } from "better-auth/adapters";

/**
 * Sentinel returned by proxy-wrapped rows for fields not included in the
 * SELECT projection. Distinguishes "not selected" from "selected but null".
 *
 * @see {@link ../methods.ts} findMany — where the proxy is applied
 */
export const UNSELECTED_FIELD = Symbol.for(
	"better-auth-surrealdb.unselected-field",
);

export type SurrealDBAdapterConfig = {
	/** @default false */
	usePlural?: boolean;
	debugLogs?: DBAdapterDebugLogOption;
};

export type SafeRecord = Record<string, unknown>;

export type DBField =
	| "string"
	| "number"
	| "boolean"
	| "date"
	| "json"
	| "string[]"
	| "number[]"
	| string[]; // literal string union (enum)
