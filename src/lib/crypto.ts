/**
 * Cifrado de secretos en DB — AES-256-GCM (Fase seguridad: credenciales en reposo).
 *
 * POR QUÉ: apiKeys de tiendas y tokens de Meta estaban en texto plano en
 * Postgres (el propio schema lo marcaba "cifrar en prod"). Formato versionado
 * `enc:v1:<iv-b64>:<ct-b64>` para poder rotar algoritmo sin migraciones.
 * Llave vía env SECRETS_ENCRYPTION_KEY (32+ caracteres). Sin llave:
 * - encryptSecret LANZA (fail-closed: jamás guarda "cifrado" falso).
 * - decryptSecret de filas legacy sin prefijo pasa el texto tal cual con un
 *   único warning (ventana de migración del backfill), pero filas `enc:v1`
 *   sin llave LANZAN (no se puede operar a ciegas).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";
let legacyWarned = false;

function getKey(): Buffer {
  // KDF simple sin dependencias: SHA-256 del passphrase → 32 bytes exactos.
  // Acepta cualquier largo; la entropía real la da un valor largo y aleatorio.
  const raw = process.env.SECRETS_ENCRYPTION_KEY ?? "";
  if (raw.length < 16) {
    throw new Error(
      "[crypto] SECRETS_ENCRYPTION_KEY ausente o <16 caracteres. Defínela en .env y Vercel (ver .env.example).",
    );
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

export function isEncrypted(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${Buffer.concat([tag, ct]).toString("base64")}`;
}

export function decryptSecret(stored: string | null | undefined): string {
  if (!stored) return "";
  if (!isEncrypted(stored)) {
    if (!legacyWarned) {
      legacyWarned = true;
      console.warn("[crypto] fila legacy sin cifrar (corre scripts/backfill-secrets.ts)");
    }
    return stored;
  }
  const key = getKey();
  const rest = stored.slice(PREFIX.length);
  const sep = rest.indexOf(":");
  if (sep === -1) throw new Error("[crypto] payload cifrado malformado");
  const iv = Buffer.from(rest.slice(0, sep), "base64");
  const tagCt = Buffer.from(rest.slice(sep + 1), "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tagCt.subarray(0, 16));
  return Buffer.concat([decipher.update(tagCt.subarray(16)), decipher.final()]).toString("utf8");
}
