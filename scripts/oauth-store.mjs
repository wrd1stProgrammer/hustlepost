import fs from "node:fs";
import path from "node:path";

const STORE_DIR = path.resolve(process.cwd(), ".oauth");

function ensureStoreDir() {
  fs.mkdirSync(STORE_DIR, { recursive: true });
}

export function writeStore(name, data) {
  ensureStoreDir();
  const filePath = path.join(STORE_DIR, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

export function readStore(name) {
  const filePath = path.join(STORE_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
