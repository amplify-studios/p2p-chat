# Specification v1.1

> 19-09-2025

---

## Encryption

- AES-256-GCM for encrypting messages.
- ECDH (Elliptic-Curve Diffie–Hellman) for deriving shared secrets between peers.
- HKDF (key derivation) to turn shared secrets into symmetric keys.

---

## Operations

1. User Connection
2. Send/Receive Message
3. Local Storage
4. Authentication
5. Registration 

### 1. User Connection

1. User provides the other user’s ID (public key or fingerprint).
2. A signaling server is used only for exchanging connection data (similar to WebRTC).
3. Each peer stores the other’s public key + fingerprint for authentication.

### 2. Send/Receive Message

#### Send

1. Generate an ephemeral ECDH key pair.
2. Perform ECDH with the recipient’s long-term public key to derive a shared secret.
3. Run the shared secret through HKDF → get an AES-256-GCM session key.
4. Encrypt the message with AES-256-GCM (random 96-bit IV per message).
5. Send:
    - Ciphertext
    - Nonce/IV
    - Ephemeral public key (so recipient can derive the same shared secret)

#### Receive

1. Use the sender’s ephemeral public key + your own private key to perform ECDH.
2. Run the shared secret through HKDF → get the AES-256-GCM session key.
3. Decrypt the ciphertext with AES-256-GCM.
4. If authentication passes, display the message.

### 3. Local Storage

All sensitive data stored in IndexedDB is encrypted with a key derived from the user’s password.

Password → strong KDF (e.g., Argon2 or scrypt) → local encryption key.

### 4. Authentication

1. Manual Key Verification (TOFU – Trust on First Use)
   - On first connection, peers exchange public keys.
   - Users verify fingerprints out-of-band (QR code, phone call, in person).
   - Once verified, keys are cached and used for future sessions.

### 5. Registration

1. No central registration.
    - Each user generates an ECDH key pair on first launch.
    - Their public key = identity.
    - Authentication via TOFU or Web of Trust.

2. Optional nicknames (local only).
    - Users may assign display names mapped to public keys.
    - Names are not globally unique or enforced.
