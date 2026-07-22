import { ALLOWED_SQLITE_EXTENSIONS, SQLITE_HEADER_TEXT } from "./32a-database-file-constants.js";

export function hasAllowedSqliteExtension(fileName) {
  const lower = String(fileName || "").trim().toLowerCase();
  return ALLOWED_SQLITE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

export function normalizeSqliteFileName(rawValue, fallback = "sqlite-db.db") {
  let name = String(rawValue || "").trim().replace(/[\\/:*?"<>|]+/g, "_");
  if (!name) name = fallback;
  if (!/\.(db|sqlite|sqlite3)$/i.test(name)) name += ".db";
  return name;
}

export function isLikelySqliteBySignature(bytes) {
  if (!bytes || bytes.length < 16) return false;
  const decoder = new TextDecoder("ascii");
  const header = decoder.decode(bytes.slice(0, 15));
  return header === SQLITE_HEADER_TEXT && bytes[15] === 0;
}

export function getKnownBinaryTypeLabel(bytes) {
  if (!bytes || !bytes.length) return "";
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) return "ZIP";
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "PDF";
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return "JPEG";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return "PNG";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "GIF";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "WEBP";
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return "MP3";
  if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return "MP4/MOV";
  return "";
}

export function assertValidSqlitePayload({
  fileName,
  bytes,
  requireAllowedExtension = true,
  allowEmptyGeneratedPayload = false
}) {
  const suppliedFileName = String(fileName || "").trim();
  const normalizedFileName = normalizeSqliteFileName(fileName, "database.db");
  if (requireAllowedExtension && !hasAllowedSqliteExtension(suppliedFileName)) {
    const error = new Error("database.invalidExtension");
    error.code = "invalid-sqlite-extension";
    error.messageKey = "database.invalidExtension";
    error.messageVariables = {
      name: suppliedFileName || normalizedFileName,
      extensions: ALLOWED_SQLITE_EXTENSIONS.join(", ")
    };
    throw error;
  }
  if (allowEmptyGeneratedPayload && (!bytes || bytes.length === 0)) {
    return normalizedFileName;
  }
  if (!isLikelySqliteBySignature(bytes)) {
    const detected = getKnownBinaryTypeLabel(bytes);
    const error = new Error(detected ? "database.invalidFileDetected" : "database.invalidFile");
    error.code = "invalid-sqlite-file";
    error.messageKey = detected ? "database.invalidFileDetected" : "database.invalidFile";
    error.messageVariables = { type: detected };
    throw error;
  }

  return normalizedFileName;
}

export function isExpectedSqliteValidationError(error) {
  return error?.code === "invalid-sqlite-extension" || error?.code === "invalid-sqlite-file";
}

export function getSqliteValidationErrorMessage(error, translate) {
  if (!isExpectedSqliteValidationError(error) || typeof translate !== "function") {
    return error?.message || String(error || "");
  }
  return translate(error.messageKey, error.messageVariables || {});
}
