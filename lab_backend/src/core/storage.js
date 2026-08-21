import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), "storage", "uploads");

// Ensure local storage directory exists
async function ensureLocalStorage() {
  try {
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  } catch (err) {
    logger.warn({ err }, "failed to create local storage directory");
  }
}
ensureLocalStorage();

/**
 * Saves a file buffer either to Supabase Storage or local disk storage.
 * Returns { storageKey, fileSizeBytes, checksum, publicUrl }
 */
export async function saveFile(buffer, { fileName, mimeType, organizationId }) {
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const ext = path.extname(fileName) || ".bin";
  const uniqueId = crypto.randomUUID();
  const storageKey = organizationId
    ? `${organizationId}/${uniqueId}${ext}`
    : `${uniqueId}${ext}`;

  // If Supabase Storage is configured, upload via REST API
  if (config.supabase.url && config.supabase.serviceRoleKey) {
    try {
      const uploadUrl = `${config.supabase.url}/storage/v1/object/${config.supabase.bucket}/${storageKey}`;
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
          "Content-Type": mimeType || "application/octet-stream",
          "x-upsert": "true",
        },
        body: buffer,
      });

      if (res.ok) {
        logger.info({ storageKey }, "file uploaded to supabase storage");
        return {
          storageKey,
          fileSizeBytes: buffer.length,
          checksum: hash,
          publicUrl: `${config.supabase.url}/storage/v1/object/public/${config.supabase.bucket}/${storageKey}`,
        };
      }
      logger.warn({ status: res.status }, "supabase storage upload failed, falling back to disk");
    } catch (err) {
      logger.warn({ err }, "supabase storage error, falling back to disk");
    }
  }

  // Fallback to local disk storage
  const targetPath = path.join(LOCAL_STORAGE_DIR, storageKey.replace(/\//g, "_"));
  await fs.writeFile(targetPath, buffer);
  logger.info({ targetPath }, "file saved to local disk storage");

  return {
    storageKey,
    fileSizeBytes: buffer.length,
    checksum: hash,
    publicUrl: null,
  };
}

/**
 * Retrieves a file buffer by storageKey.
 */
export async function getFile(storageKey) {
  if (config.supabase.url && config.supabase.serviceRoleKey) {
    try {
      const downloadUrl = `${config.supabase.url}/storage/v1/object/${config.supabase.bucket}/${storageKey}`;
      const res = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${config.supabase.serviceRoleKey}` },
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    } catch (err) {
      logger.warn({ err }, "failed to fetch from supabase storage, checking local disk");
    }
  }

  const targetPath = path.join(LOCAL_STORAGE_DIR, storageKey.replace(/\//g, "_"));
  return fs.readFile(targetPath);
}

export default {
  saveFile,
  getFile,
};
