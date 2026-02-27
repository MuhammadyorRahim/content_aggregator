#!/usr/bin/env node

import { rmSync } from "node:fs";
import path from "node:path";
import { copyFileSync, existsSync } from "node:fs";

const rootDir = process.cwd();
const sourceCandidates = [
  path.resolve(rootDir, "prisma", "data.db"),
  path.resolve(rootDir, "prisma", "prisma", "data.db"),
];
const sourceDbPath = sourceCandidates.find((candidate) => existsSync(candidate));
const targetDbPath = path.resolve(rootDir, "prisma", "test-data.db");
const databaseUrl = "file:./test-data.db";

if (!sourceDbPath) {
  console.error(`Source database does not exist. Checked: ${sourceCandidates.join(", ")}`);
  process.exit(1);
}

rmSync(targetDbPath, { force: true });
rmSync(`${targetDbPath}-journal`, { force: true });
rmSync(`${targetDbPath}-wal`, { force: true });
rmSync(`${targetDbPath}-shm`, { force: true });

copyFileSync(sourceDbPath, targetDbPath);

console.log(`Prepared test database: ${databaseUrl}`);
