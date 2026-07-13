import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationDirectory = path.join(projectRoot, "database", "migrations");
const migrationPattern = /^(\d{4})_[a-z0-9_]+\.sql$/;
const files = (await readdir(migrationDirectory)).filter((file) => file.endsWith(".sql")).sort();

if (!files.length) {
  throw new Error("No database migrations found.");
}

for (const [index, file] of files.entries()) {
  const match = migrationPattern.exec(file);
  if (!match) {
    throw new Error(`Invalid migration filename: ${file}`);
  }

  const expectedVersion = String(index + 1).padStart(4, "0");
  if (match[1] !== expectedVersion) {
    throw new Error(`Expected migration ${expectedVersion}, found ${match[1]} in ${file}`);
  }

  const sql = await readFile(path.join(migrationDirectory, file), "utf8");
  const normalized = sql.toLowerCase();
  if (!normalized.includes(`migration ${expectedVersion}`)) {
    throw new Error(`${file} is missing its migration version header.`);
  }
  if (!/\bbegin\s*;/.test(normalized) || !/\bcommit\s*;/.test(normalized)) {
    throw new Error(`${file} must be wrapped in BEGIN and COMMIT.`);
  }
}

console.log(`Validated ${files.length} ordered Miiix database migrations: ${files.join(", ")}`);
