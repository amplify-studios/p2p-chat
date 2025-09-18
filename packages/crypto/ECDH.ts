import crypto from "crypto"

export function createECDHkey(): crypto.ECDH {
  const user: crypto.ECDH = crypto.createECDH('secp256k1')
  user.generateKeys()
  return user
}

export function computeSecret(user_ECDH: crypto.ECDH, otherPublicKey: string): Buffer {
  return user_ECDH.computeSecret(Buffer.from(otherPublicKey, "hex"))
}

export function secretMatch(user_secret: Buffer, other_secret: Buffer): boolean {
  return user_secret.equals(other_secret)
}

export function encryptMessage(otherPublicKey: string, message: string): string {

}

// // 1. Each party generates their ECDH key pair
// const alice = crypto.createECDH('secp256k1'); // Bitcoin's curve
// alice.generateKeys();

// const bob = crypto.createECDH('secp256k1');
// bob.generateKeys();

// // 2. They exchange their public keys
// const alicePublicKey = alice.getPublicKey();
// const bobPublicKey = bob.getPublicKey();

// console.log("Alice's Public Key:", alicePublicKey.toString('hex'));
// console.log("Bob's Public Key:", bobPublicKey.toString('hex'));

// // 3. Each computes the shared secret using the other’s public key
// const aliceSharedSecret = alice.computeSecret(bobPublicKey);
// const bobSharedSecret = bob.computeSecret(alicePublicKey);

// // 4. Both secrets are identical
// console.log("Alice's Shared Secret:", aliceSharedSecret.toString('hex'));
// console.log("Bob's Shared Secret:", bobSharedSecret.toString('hex'));

// console.log("Shared secrets match:", aliceSharedSecret.equals(bobSharedSecret));
