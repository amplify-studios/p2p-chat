# Specification v1

> 18-09-2025

## Encryption

- **AES-256-GCM** for encrypting messages.
- **ECDH**, instead of RSA for forward secrecy.
- **HMAC** hashing

## Operations

1. User Connection
2. Send/Receive Message
3. Local Storage
4. Authentication

### 1. User Connection

1. User provides other user's ID
2. Signaling server handles the transaction
3. We save the other user's credentials

### 2. Send/Receive Message

#### Send

1. We generate an AES key
2. We generate a hash for the message
3. The message gets encrypted by AES
4. We encrypt the AES key with the ECDH public key of the other user
5. We send the message along with the encrypted AES key and the hash (HMAC)
6. We display the message

#### Receive

1. We decrypt the AES key with our private ECDH key.
2. We decrypt the message with the AES key
3. We verify that it's intact using the hash
4. We display the message

### 3. Local Storage

- We have a different "table" for each conversation
- We store each encrypted message along with its encrypted AES key
- We store the user's credentials
- We store our credentials

### 4. Authentication

1. Manual Key Verification (“Trust on First Use” / TOFU)

- When two peers first connect, they exchange public keys.
- Each user verifies the key fingerprint out-of-band (e.g., QR code, phone call, in person).
- After verification, the key is cached and used for future sessions.
- Pros: Simple, works without any servers.
- Cons: User must verify manually, vulnerable to MitM on first connection if verification isn’t done.
  > Example: Signal shows a key fingerprint that you can verify with a contact in person.

2. Web of Trust

- Peers sign each other’s public keys.
- If a key is signed by someone you already trust, it can be accepted.
- Can scale in a P2P network if peers maintain a graph of trusted signatures.
- Pros: Fully decentralized, more flexible than TOFU.
- Cons: Complex to manage, trust decisions can be tricky.
  > Example: PGP uses this model.

#### Registration

1. No Registration (Anonymous / Key-based)

- Each user generates a key pair on first launch (ECDH).
- Their public key acts as their identity.
- Other users authenticate them via TOFU (trust on first use) or Web of Trust.
- Pros:
  - No central server.
  - No email/password needed.
  - Fully decentralized.
- Cons:
  - Harder to recover your identity if you lose your keys.
  - Usernames or metadata are not centrally controlled, so discoverability is limited.

2. Optional Nicknames / Local Registration

- You can let users pick a display name locally.
- Name is only stored on their device or optionally shared with peers.
- The “registration” is just a local mapping of name → public key.
- Pros:
  - Simple, user-friendly.
  - Still decentralized.
- Cons:
  - Names can collide or be spoofed.

##### Process

1. User provides a username
2. We generate an ID
3. We generate ECDH key-pair
4. We register with the Signaling Server
