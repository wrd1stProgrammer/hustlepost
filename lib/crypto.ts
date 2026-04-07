import crypto from "node:crypto";

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("Missing ENCRYPTION_KEY");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(value: string) {
  const [version, ivPart, tagPart, encryptedPart] = value.split(".");

  if (version !== "v1" || !ivPart || !tagPart || !encryptedPart) {
    throw new Error("Invalid encrypted payload format");
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivPart, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
