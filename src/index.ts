import type { BetterAuthOptions } from "@better-auth/core";
import type {
	AdapterFactoryOptions,
	DBAdapter,
} from "@better-auth/core/db/adapter";
import { createAdapterFactory } from "@better-auth/core/db/adapter";
import { RecordId, type Surreal, Uuid } from "surrealdb";

import { buildAdapterMethods } from "./methods";
import { createSchema } from "./schema";
import { type SurrealDBAdapterConfig, UNSELECTED_FIELD } from "./types";
import { coerceToOutputId, coerceToRecordId, toDate } from "./utils";

export { parseRecordId } from "./utils";

/**
 * Create a SurrealDB adapter for better-auth.
 *
 * @example
 * ```ts
 * import { surrealDBAdapter } from "better-auth-surrealdb";
 * import { Surreal } from "surrealdb";
 *
 * const db = new Surreal();
 * await db.connect("http://localhost:8000");
 *
 * const auth = betterAuth({
 *   database: surrealDBAdapter({ db }),
 * });
 * ```
 */
export const surrealDBAdapter = ({
	db,
	config,
}: {
	db: Surreal;
	config?: SurrealDBAdapterConfig;
}) => {
	// Captured lazily — better-auth passes its resolved options only when
	// the returned factory is called, but we need them inside the
	// transaction handler which is defined earlier in `adapterOptions`.
	let lazyOptions: BetterAuthOptions | null = null;
	let adapterOptions: AdapterFactoryOptions | null = null;

	adapterOptions = {
		config: {
			adapterId: "surrealdb",
			adapterName: "SurrealDB",
			supportsJSON: true,
			supportsArrays: true,
			supportsUUIDs: true,
			supportsNumericIds: false,
			...config,

			customTransformInput: ({ data, field, fieldAttributes }) => {
				if (data === null) return undefined;

				const isIdField =
					field === "id" ||
					(fieldAttributes?.references?.field === "id" && data !== undefined);

				if (isIdField) {
					return coerceToRecordId(data);
				}

				return data;
			},

			customTransformOutput: ({ data, field, fieldAttributes }) => {
				if (data === UNSELECTED_FIELD) return undefined;
				if (data === undefined) return null;
				if (data === null) return null;

				if (field === "id" || fieldAttributes?.references?.field === "id") {
					return coerceToOutputId(data);
				}

				if (fieldAttributes?.type === "date") {
					return toDate(data);
				}

				return data;
			},

			customIdGenerator: ({ model }) => {
				return new RecordId(model, Uuid.v7()).toString();
			},

			transaction: async (callback) => {
				if (!adapterOptions)
					throw new Error("SurrealDB adapter not initialized");
				if (!lazyOptions)
					throw new Error("SurrealDB adapter options not initialized");

				const txn = await db.beginTransaction();
				try {
					// Build a fresh adapter wired to the transaction handle so all
					// queries inside the callback share the same transaction scope.
					const txnAdapter = createAdapterFactory({
						config: adapterOptions.config,
						adapter: (helpers) => ({
							createSchema,
							...buildAdapterMethods(txn, helpers),
						}),
					})(lazyOptions);
					const result = await callback(txnAdapter);
					await txn.commit();
					return result;
				} catch (error) {
					await txn.cancel();
					throw error;
				}
			},
		},
		adapter: (helpers) => ({
			createSchema,
			...buildAdapterMethods(db, helpers),
		}),
	};

	const adapter = createAdapterFactory(adapterOptions);

	return (options: BetterAuthOptions): DBAdapter => {
		lazyOptions = options;
		const instance = adapter(options);

		// Workaround: @better-auth/test-utils sets `adapter.transaction = undefined`
		// during test suite setup. Pin it behind a getter so the write is ignored.
		if (typeof instance.transaction === "function") {
			const stableTransaction = instance.transaction.bind(instance);
			Object.defineProperty(instance, "transaction", {
				configurable: true,
				enumerable: true,
				get: () => stableTransaction,
				set: () => undefined,
			});
		}
		return instance;
	};
};
