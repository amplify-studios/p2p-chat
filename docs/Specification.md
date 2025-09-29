# Specification v1.2

> 29-09-2025

<!--toc:start-->
- [Specification v1.2](#specification-v12)
  - [Encryption](#encryption)
  - [Operations](#operations)
    - [1. User Connection](#1-user-connection)
    - [2. Send/Receive Message](#2-sendreceive-message)
      - [Send](#send)
        - [Send Pseudocode example](#send-pseudocode-example)
      - [Receive](#receive)
        - [Receive Pseudocode Example](#receive-pseudocode-example)
    - [3. Local Storage](#3-local-storage)
    - [4. Authentication](#4-authentication)
    - [5. Registration](#5-registration)
<!--toc:end-->

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

1. Generate ephemeral ECDH key pair esk, epk (X25519).
2. Compute ECDH shared secret Z = ECDH(esk, recipient_longterm_pk).
3. Compute a random salt (recommended) or derive salt from context (e.g., an ephemeral session id).
4. Run HKDF-SHA256:
```ini
HK = HKDF-Extract(salt, Z)
KDF_output = HKDF-Expand(HK, info = "MyProto v1 | senderID | recipientID | epk", L)
```
Split KDF_output into: K_enc (32 bytes AES-256 key), K_nonce_seed (16/32 bytes) and optionally K_other (for key confirmation).

5. Derive the per-message nonce deterministically, e.g.:
    - If using per-message ephemeral keys: nonce = HKDF-Expand(K_nonce_seed, "nonce" | message_seq, 12) (12 bytes for AES-GCM), or
    - Use a 96-bit random nonce but include it in the message and ensure uniqueness.
6. Choose AAD = concat(protocol_version, senderID, recipientID, timestamp, message_seq) (whatever you need) — this is authenticated but not encrypted.
7. Encrypt: ciphertext, authTag = AES-256-GCM-Encrypt(K_enc, nonce, plaintext, AAD).
8. Send the message package:
    - epk (sender ephemeral public key)
    - nonce (if you used random nonce, or omit if derived deterministically)
    - ciphertext
    - authTag
    - protocol_version, senderID, message_seq, timestamp (as needed)

##### Send Pseudocode example

```text
function SendMessage(recipient_pk, sender_id, recipient_id, plaintext, message_seq):
    # 1. Generate ephemeral ECDH keypair
    (esk, epk) = GenerateEphemeralKeypair()

    # 2. Derive shared secret with recipient’s long-term public key
    Z = ECDH(esk, recipient_pk)

    # 3. Define context for KDF
    salt = RandomBytes(32)                       # or session-specific
    info = "ProtoV1|" + sender_id + "|" + recipient_id + "|" + epk

    # 4. Run HKDF (Extract + Expand)
    KDF_output = HKDF(salt, Z, info, L = 48)     # 32 bytes for key, 16 for nonce seed
    K_enc = First32Bytes(KDF_output)             # AES-256 key
    K_nonce_seed = Last16Bytes(KDF_output)

    # 5. Derive nonce deterministically
    nonce = HKDF_Expand(K_nonce_seed, "nonce|" + message_seq, L = 12)

    # 6. Build Associated Data (AAD)
    AAD = Encode(sender_id, recipient_id, message_seq, "ProtoV1")

    # 7. Encrypt
    (ciphertext, authTag) = AES256_GCM_Encrypt(K_enc, nonce, plaintext, AAD)

    # 8. Package message
    message = {
        "ephemeral_pk": epk,
        "salt": salt,
        "nonce": nonce,                # include only if not derivable
        "ciphertext": ciphertext,
        "authTag": authTag,
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "message_seq": message_seq,
        "protocol_version": "ProtoV1"
    }

    return message
```

#### Receive

1. Use the sender’s ephemeral public key + your own private key to perform ECDH.
2. Run the shared secret through HKDF → get the AES-256-GCM session key.
3. Decrypt the ciphertext with AES-256-GCM.
4. If authentication passes, display the message.

##### Receive Pseudocode Example

```text
function ReceiveMessage(message, recipient_sk):

    # 1. Extract fields from the incoming message
    epk              = message["ephemeral_pk"]
    salt             = message["salt"]
    nonce            = message["nonce"]           # may be omitted if derived deterministically
    ciphertext       = message["ciphertext"]
    authTag          = message["authTag"]
    sender_id        = message["sender_id"]
    recipient_id     = message["recipient_id"]
    message_seq      = message["message_seq"]
    protocol_version = message["protocol_version"]

    # 2. Perform ECDH using your private key and the sender’s ephemeral public key
    Z = ECDH(recipient_sk, epk)

    # 3. Re-run HKDF with same parameters
    info = "ProtoV1|" + sender_id + "|" + recipient_id + "|" + epk
    KDF_output = HKDF(salt, Z, info, L = 48)   # 32 + 16
    K_enc = First32Bytes(KDF_output)
    K_nonce_seed = Last16Bytes(KDF_output)

    # 4. Derive nonce (if not explicitly included in message)
    if nonce == null:
        nonce = HKDF_Expand(K_nonce_seed, "nonce|" + message_seq, L = 12)

    # 5. Rebuild AAD exactly as sender did
    AAD = Encode(sender_id, recipient_id, message_seq, protocol_version)

    # 6. Attempt decryption
    plaintext = AES256_GCM_Decrypt(K_enc, nonce, ciphertext, AAD, authTag)

    if plaintext == FAIL:
        return "Authentication failed – reject message"

    return plaintext
```

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
