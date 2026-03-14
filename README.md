# better-auth-surrealdb

A [SurrealDB](https://surrealdb.com) database adapter for [better-auth](https://better-auth.com).

> **Note:** This adapter passes 110 tests covering CRUD operations, joins, transactions, and auth flows. Some edge cases may not yet have test coverage — if you run into issues, please [open an issue](https://github.com/anuj-kuralkar/better-auth-surrealdb/issues).

## Installation

```zsh
bunx jsr add @alde/ba-surreal
```

## Peer Dependencies

Make sure you have these installed in your project:

```zsh
bun add better-auth surrealdb
```

## Generate Schema

Run the better-auth CLI to generate the required SurrealDB schema file:
```zsh
bunx auth generate
```

Then execute the generated file against your SurrealDB instance:
```zsh
surreal import --conn <connection-url> --user <username> --pass <password> --ns <namespace> --db <database> auth.surql
```

## Usage

```ts
// auth.ts
import { betterAuth } from "better-auth";
import { surrealDBAdapter } from "@anuj-kuralkar/better-auth-surrealdb";
import { getDatabase } from "@/lib/database";

// Get an initialized SurrealDB client
const db = await getDatabase();

export const auth = betterAuth({
  database: surrealDBAdapter({
    db,
    config: {
      // Optional adapter configuration
    },
  }),
});
```

## Contributing

Issues and PRs are welcome! Please open an issue before submitting large changes.

## License

MIT

---

## ☁️ SurrealDB Cloud

Yes, this is a referral link. Yes, I get credits. 
Yes, you also get free credits. We're both winning here.
→ [SurrealDB Cloud](https://app.surrealdb.com/referral?code=k99v09od49d9cw8t)
