# better-auth-surrealdb

A [SurrealDB](https://surrealdb.com) database adapter for [better-auth](https://better-auth.com).

> ⚠️ This package is a work in progress.

## Installation

```zsh
bun add better-auth-surrealdb
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
import { surrealDBAdapter } from "better-auth-surrealdb";
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
