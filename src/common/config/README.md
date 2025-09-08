# Database migrations

## 2. Useful pnpm scripts (from `package.json`)

| Script                                       | What it does                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm run migration:create -- <name>`         | Creates an **empty** migration file (you fill the `up` / `down` methods manually).                |
| `pnpm run migration:generate -- <nameOrPath>` | Generates a migration based on differences between your entities and the current database schema. |
| `pnpm run migration:run`                      | Executes all pending migrations against the database.                                             |
| `pnpm run migration:revert`                   | Rolls back the most recently executed migration.                                                  |
| `pnpm run migration:show`                     | Prints a list showing which migrations have been executed and which are still pending.            |
| `pnpm run schema:sync`                        | Syncs the schema **without** generating a migration (not recommended for production).             |
| `pnpm run schema:drop`                        | Drops the entire database schema (use with care!).                                                |

Under the hood these commands call the generic `pnpm run typeorm` script:

```json
"typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d ./src/shared/config/typeorm.config.ts"
```

That script boots the TypeORM CLI with **ts-node** and tells it where to find the `DataSource` definition (`-d ./src/shared/config/typeorm.config.ts`).

---

## 3. Common workflows

### 3.1 Create an empty migration

```bash
pnpm run migration:create -- src/migrations/AddNewTable
```

This creates a timestamped file like `src/migrations/1751399999999-AddNewTable.ts` containing empty `up` and `down` methods ready for manual SQL.

### 3.2 Auto-generate a migration from entities

```bash
# 1️⃣ Make or update your entities
# 2️⃣ Then generate the migration
pnpm migration:generate ./src/migrations/InitTable
```

TypeORM will compare your entity classes with the current database schema and write the SQL needed to get the database up-to-date.

### 3.3 Run pending migrations

```bash
pnpm run migration:run
```

Every migration that hasn't been applied yet will now be executed.

### 3.4 Revert the last migration

```bash
pnpm run migration:revert
```

Rolls back **only the most recently executed** migration.

---

## 4. Tips & Troubleshooting

• **Missing required argument: dataSource** – Make sure the `-d` flag in the `typeorm` script points to the correct path (`src/shared/config/typeorm.config.ts`).

• **Cannot connect to database** – Double-check your `.env` credentials and that the database exists and is reachable.

• **Entities not found during generation** – Because the CLI runs with `ts-node`, paths must match the files in `src/**/*.ts`. Make sure you exported your entities correctly and restarted the command after adding new files.

• **Migration file is empty** – If TypeORM detects no difference between the current schema and your entities, it will generate an empty migration. Confirm that `synchronize` is **false** in the `DataSource` config so that the schema isn't auto-synced at runtime.

---

Happy migrating! 🎉
