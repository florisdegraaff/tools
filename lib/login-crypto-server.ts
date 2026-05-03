import { constants, createPrivateKey, privateDecrypt } from "node:crypto";

function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, "\n").trim();
}

/**
 * Decrypt RSA-OAEP SHA-256 ciphertext produced by the browser (encryptLoginPassword).
 */
export function decryptLoginPassword(
  privateKeyPem: string,
  ciphertext: Buffer,
): string {
  const key = createPrivateKey(normalizePem(privateKeyPem));
  const plaintext = privateDecrypt(
    {
      key,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    ciphertext,
  );
  return plaintext.toString("utf8");
}
