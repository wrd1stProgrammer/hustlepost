#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function printUsage() {
  console.error(
    "Usage: node scripts/import-latest-viral-posts.mjs <topic-cluster> [--dir <filtered-dir>] [--env <path-to-env>]",
  );
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let topicCluster = "";
  let dir = "/root/.openclaw/workspace/threads-worker/data/filtered";
  let envPath;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--dir") {
      dir = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--env") {
      envPath = args[index + 1];
      index += 1;
      continue;
    }

    if (!topicCluster) {
      topicCluster = arg;
    }
  }

  return { topicCluster, dir, envPath };
}

function findLatestFile(dir, topicCluster) {
  const absoluteDir = path.resolve(process.cwd(), dir);

  if (!fs.existsSync(absoluteDir)) {
    throw new Error(`Directory not found: ${absoluteDir}`);
  }

  const pattern = `ingest-${topicCluster}-`;
  const matches = fs
    .readdirSync(absoluteDir)
    .filter((file) => file.startsWith(pattern) && file.endsWith(".json"))
    .map((file) => {
      const filePath = path.join(absoluteDir, file);
      const stat = fs.statSync(filePath);
      return { file, filePath, mtimeMs: stat.mtimeMs };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  if (matches.length === 0) {
    throw new Error(
      `No ingest JSON found for topic cluster "${topicCluster}" in ${absoluteDir}`,
    );
  }

  return matches[0].filePath;
}

function main() {
  const { topicCluster, dir, envPath } = parseArgs(process.argv);

  if (!topicCluster) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const latestFile = findLatestFile(dir, topicCluster);
  console.log(`Latest file for ${topicCluster}: ${latestFile}`);

  const commandArgs = ["scripts/import-viral-posts.mjs", latestFile];

  if (envPath) {
    commandArgs.push("--env", envPath);
  }

  const result = spawnSync("node", commandArgs, {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  process.exitCode = result.status ?? 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
