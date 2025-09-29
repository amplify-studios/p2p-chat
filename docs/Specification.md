# Specification v1.2

> 29-09-2025

<!--toc:start-->
- [Specification v1.2](#specification-v12)
  - [Encryption](#encryption)
  - [Operations](#operations)
    - [1. User Connection](#1-user-connection)
    - [2. Messaging](#2-messaging)
      - [Sending](#sending)
        - [Sending - Pseudocode](#sending---pseudocode)
      - [Receiving](#receiving)
        - [Receiving - Pseudocode](#receiving---pseudocode)
    - [3. Local Storage](#3-local-storage)
    - [4. Authentication](#4-authentication)
    - [5. Registration](#5-registration)
<!--toc:end-->

---

## Encryption

* **AES-256-GCM** is used for message confidentiality and integrity.
* **ECDH (X25519)** is used to derive ephemeral shared secrets between peers.
* **HKDF (SHA-256)** is used to expand shared secrets into symmetric keys and nonces.

---

## Operations

Supported operations include:

1. User Connection
2. Messaging (Send/Receive)
3. Local Storage
4. Authentication
5. Registration

---

### 1. User Connection

1. A user obtains another peer’s identifier (public key or fingerprint).
2. A signaling server is used only to exchange connection metadata (similar to WebRTC).
3. Each peer stores the other’s public key and fingerprint for authentication purposes.

---

### 2. Messaging

#### Sending

1. Generate an ephemeral ECDH key pair `(esk, epk)` using X25519.
2. Compute the shared secret:

   ```
   Z = ECDH(esk, recipient_longterm_pk)
   ```
3. Select a salt: either random (recommended) or derived from session context.
4. Run HKDF-SHA256:

   ```ini
   HK = HKDF-Extract(salt, Z)
   KDF_output = HKDF-Expand(HK, info = "MyProto v1 | senderID | recipientID | epk", L)
   ```

   Split `KDF_output` into:

   * `K_enc` (32 bytes, AES-256 key)
   * `K_nonce_seed` (16–32 bytes, for nonce derivation)
   * `K_other` (optional, e.g., for key confirmation)
5. Derive a per-message nonce:

   * Deterministic:

     ```
     nonce = HKDF-Expand(K_nonce_seed, "nonce|" + message_seq, 12)
     ```
   * Or random 96-bit value (must be unique; then included in the message).
6. Construct **Associated Data (AAD)**:

   ```
   AAD = concat(protocol_version, senderID, recipientID, timestamp, message_seq)
   ```
7. Encrypt with AES-256-GCM:

   ```
   (ciphertext, authTag) = AES-256-GCM-Encrypt(K_enc, nonce, plaintext, AAD)
   ```
8. Send the message containing:

   * `epk` (ephemeral public key)
   * `salt`
   * `nonce` (if random; omitted if derived deterministically)
   * `ciphertext`
   * `authTag`
   * `protocol_version`, `senderID`, `recipientID`, `message_seq`, `timestamp`

##### Sending - Pseudocode

```text
function SendMessage(recipient_pk, sender_id, recipient_id, plaintext, message_seq):
    (esk, epk) = GenerateEphemeralKeypair()
    Z = ECDH(esk, recipient_pk)

    salt = RandomBytes(32)
    info = "ProtoV1|" + sender_id + "|" + recipient_id + "|" + epk

    KDF_output = HKDF(salt, Z, info, L = 48)
    K_enc = First32Bytes(KDF_output)
    K_nonce_seed = Last16Bytes(KDF_output)

    nonce = HKDF_Expand(K_nonce_seed, "nonce|" + message_seq, L = 12)

    AAD = Encode(sender_id, recipient_id, message_seq, "ProtoV1")

    (ciphertext, authTag) = AES256_GCM_Encrypt(K_enc, nonce, plaintext, AAD)

    message = {
        "ephemeral_pk": epk,
        "salt": salt,
        "nonce": nonce,
        "ciphertext": ciphertext,
        "authTag": authTag,
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "message_seq": message_seq,
        "protocol_version": "ProtoV1"
    }

    return message
```

---

#### Receiving

1. Extract the message fields.
2. Compute the shared secret:

   ```
   Z = ECDH(recipient_sk, epk)
   ```
3. Re-run HKDF with the provided salt and same info string to derive `K_enc` and `K_nonce_seed`.
4. Derive the nonce (unless explicitly included in the message).
5. Rebuild the AAD exactly as the sender did.
6. Attempt AES-256-GCM decryption. If authentication fails, reject the message.

##### Receiving - Pseudocode

```text
function ReceiveMessage(message, recipient_sk):
    epk              = message["ephemeral_pk"]
    salt             = message["salt"]
    nonce            = message["nonce"]
    ciphertext       = message["ciphertext"]
    authTag          = message["authTag"]
    sender_id        = message["sender_id"]
    recipient_id     = message["recipient_id"]
    message_seq      = message["message_seq"]
    protocol_version = message["protocol_version"]

    Z = ECDH(recipient_sk, epk)

    info = "ProtoV1|" + sender_id + "|" + recipient_id + "|" + epk
    KDF_output = HKDF(salt, Z, info, L = 48)
    K_enc = First32Bytes(KDF_output)
    K_nonce_seed = Last16Bytes(KDF_output)

    if nonce == null:
        nonce = HKDF_Expand(K_nonce_seed, "nonce|" + message_seq, L = 12)

    AAD = Encode(sender_id, recipient_id, message_seq, protocol_version)

    plaintext = AES256_GCM_Decrypt(K_enc, nonce, ciphertext, AAD, authTag)

    if plaintext == FAIL:
        return "Authentication failed – reject message"

    return plaintext
```

---

### 3. Local Storage

* All sensitive data stored locally (e.g., in IndexedDB) must be encrypted.
* Derive the local encryption key from the user’s password using a strong KDF such as **Argon2id** or **scrypt**.

---

### 4. Authentication

* **Trust on First Use (TOFU)**:

  * On initial connection, peers exchange long-term public keys.
  * Users verify key fingerprints out-of-band (QR code, phone call, in person).
  * Verified keys are cached locally for subsequent sessions.

---

### 5. Registration

* No centralized registration service exists.
* Each user generates an ECDH key pair on first use; the public key is their identity.
* Authentication relies on TOFU or a Web of Trust.
* Optional: users may assign local nicknames mapped to public keys.

  * Nicknames are not globally unique or enforced.

