/**
 * Browser-only: encrypt the login password with the RSA public key (RSA-OAEP SHA-256).
 * The public key is not secret; it is exposed via NEXT_PUBLIC_LOGIN_RSA_PUBLIC_KEY.
 */

function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, "\n").trim();
}

function pemSpkiToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = normalizePem(pem);
  const b64 = normalized
    .replace(/-----BEGIN PUBLIC KEY-----/i, "")
    .replace(/-----END PUBLIC KEY-----/i, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export async function encryptLoginPassword(
  password: string,
  publicKeyPem: string,
): Promise<string> {
  const keyData = pemSpkiToArrayBuffer(publicKeyPem);
  const publicKey = await crypto.subtle.importKey(
    "spki",
    keyData,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    new TextEncoder().encode(password),
  );
  return arrayBufferToBase64(ciphertext);
}
