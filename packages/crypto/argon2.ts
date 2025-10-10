// import * as argon2 from 'argon2-browser';
//
// /**
//  * Derives a strong encryption key from a password using Argon2id
//  * @param password User-provided password
//  * @param salt Optional salt (if not provided, a random 16-byte salt will be generated)
//  * @param keyLength Desired length of the output key in bytes (default 32 for AES-256)
//  * @returns Object containing the derived key (Uint8Array) and the salt used (Uint8Array)
//  */
// export async function deriveEncryptionKey(
//   password: string,
//   salt?: Uint8Array,
//   keyLength = 32,
// ): Promise<{ key: Uint8Array; salt: Uint8Array }> {
//   if (!salt) {
//     salt = new Uint8Array(16);
//     crypto.getRandomValues(salt);
//   }
//
//   const result = await argon2.hash({
//     pass: password,
//     salt,
//     time: 4, // iterations
//     mem: 65536, // memory in KB (64 MB)
//     hashLen: keyLength,
//     parallelism: 2,
//     type: argon2.ArgonType.Argon2id,
//   });
//
//   return { key: result.hash as Uint8Array, salt };
// }
