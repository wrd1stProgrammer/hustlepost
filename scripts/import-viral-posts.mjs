#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { loadEnv, requireEnv } from "./load-env.mjs";

const BATCH_SIZE = 50;

function printUsage() {
  console.error(
    "Usage: node scripts/import-viral-posts.mjs <path-to-json> [--env <path-to-env>]",
  );
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let filePath = "";
  let envPath;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--env") {
      envPath = args[index + 1];
      index += 1;
      continue;
    }

    if (!filePath) {
      filePath = arg;
    }
  }

  return { filePath, envPath };
}

function readJsonArray(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`JSON file not found: ${absolutePath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8"));

  if (!Array.isArray(parsed)) {
    throw new Error("Expected top-level JSON array of viral_posts rows.");
  }

  return { absolutePath, rows: parsed };
}

function normalizeRow(row) {
  return {
    platform: row.platform,
    external_post_id: row.external_post_id,
    author_handle: row.author_handle ?? null,
    author_name: row.author_name ?? null,
    source_url: row.source_url,
    category: row.category,
    content_text: row.content_text,
    view_count:
      typeof row.view_count === "number" ? Math.trunc(row.view_count) : null,
    like_count:
      typeof row.like_count === "number" ? Math.trunc(row.like_count) : null,
    published_at: row.published_at ?? null,
    language_code: row.language_code ?? "ko",
    normalized_metrics:
      row.normalized_metrics && typeof row.normalized_metrics === "object"
        ? row.normalized_metrics
        : {},
    virality_score:
      typeof row.virality_score === "number" ? row.virality_score : null,
  };
}

function validateRow(row, index) {
  const requiredKeys = [
    "platform",
    "external_post_id",
    "source_url",
    "category",
    "content_text",
  ];

  for (const key of requiredKeys) {
    if (!row[key]) {
      throw new Error(`Row ${index} is missing required key: ${key}`);
    }
  }

  if (row.platform !== "threads" && row.platform !== "x") {
    throw new Error(`Row ${index} has invalid platform: ${row.platform}`);
  }
}

function chunk(array, size) {
  const chunks = [];

  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }

  return chunks;
}

async function upsertBatch({ supabaseUrl, serviceRoleKey, rows }) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/viral_posts?on_conflict=platform,external_post_id`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(rows),
    },
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase upsert failed (${response.status}): ${text}`);
  }

  return text ? JSON.parse(text) : [];
}

async function main() {
  const { filePath, envPath } = parseArgs(process.argv);

  if (!filePath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  loadEnv(envPath ? path.resolve(process.cwd(), envPath) : undefined);
  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

  const { absolutePath, rows } = readJsonArray(filePath);
  const normalizedRows = rows.map(normalizeRow);

  normalizedRows.forEach(validateRow);

  const batches = chunk(normalizedRows, BATCH_SIZE);
  let inserted = 0;
  let failedBatches = 0;

  for (const [index, batch] of batches.entries()) {
    try {
      const result = await upsertBatch({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        rows: batch,
      });

      inserted += Array.isArray(result) ? result.length : 0;
      console.log(
        `Batch ${index + 1}/${batches.length} succeeded (${batch.length} rows).`,
      );
    } catch (error) {
      failedBatches += 1;
      console.error(
        `Batch ${index + 1}/${batches.length} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        source_file: absolutePath,
        total_rows: normalizedRows.length,
        batch_size: BATCH_SIZE,
        inserted_rows: inserted,
        failed_batches: failedBatches,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
