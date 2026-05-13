import { createTestSuite } from "@better-auth/test-utils/adapter";
import { expect } from "vitest";

export const normalTestSurrealSuite = createTestSuite(
	"normal-surreal",
	{},
	({
		adapter,
		customIdGenerator,
		modifyBetterAuthOptions,
		transformIdOutput,
		transformGeneratedModel,
		generate,
		getBetterAuthOptions,
	}) => ({
		"create - should create a model": async () => {
			const user = await generate("user");
			user.id = `user:${user.id}`;
			// console.log(`pre-transformed:`, user);
			const result = await adapter.create<User>({
				model: "user",
				data: user,
				forceAllowId: true,
			});
			const options = getBetterAuthOptions();
			if (
				options.advanced?.database?.generateId === "serial" ||
				options.advanced?.database?.generateId === "uuid"
			) {
				user.id = result.id;
			}

			expect(typeof result.id).toEqual("string");
			const transformed = transformGeneratedModel(user);
			// console.log(`transformed:`, transformed);
			// console.log(`result:`, result);
			expect(result).toEqual(transformed);
		},

		"create - should use generateId if provided": async () => {
			const ID = (await customIdGenerator?.()) || "user:MOCK-ID";
			await modifyBetterAuthOptions(
				{
					advanced: {
						database: {
							generateId: () => ID,
						},
					},
				},
				false,
			);
			const { id: _, ...user } = await generate("user");
			const res = await adapter.create<User>({
				model: "user",
				data: user,
			});
			expect(res.id).toEqual(transformIdOutput ? transformIdOutput(ID) : ID);
			const findResult = await adapter.findOne<User>({
				model: "user",
				where: [{ field: "id", value: res.id }],
			});
			expect(findResult).toEqual(res);
		},
	}),
);
