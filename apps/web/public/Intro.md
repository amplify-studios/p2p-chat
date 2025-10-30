# P2P Chat — Private, Peer-to-Peer Messaging

> Secure communication without servers in the middle.

---

## What Is P2P Chat?

P2P Chat is a privacy-focused messaging application that enables direct, end-to-end encrypted communication between users.  
There are no central servers, no account registrations, and no cloud storage.  

Instead of routing messages through company servers, users connect directly to each other over a peer-to-peer (P2P) encrypted link.  
Messages exist only on the participants’ devices — never stored or processed elsewhere.

---

## What It Does

- Private messaging secured with AES-256 and ECDH encryption.  
- Identity verification using a fingerprint system (trust on first use).  
- Real-time delivery once a P2P connection is established.  
- Local encrypted message storage using a key derived from the user’s password.  
- Direct, decentralized communication with no central control or monitoring.  
- Lightweight signaling service used only to exchange connection information.  

---

## What It Doesn’t Do

- No cloud backups — messages are stored only on local devices.  
- No global usernames or centralized accounts.  
- No message recovery — lost keys or devices mean lost messages.  
- No data collection, telemetry, or tracking.  
- No password resets — the encryption key is your identity.  

---

## How It Works (Simplified Overview)

1. Each user generates a cryptographic key pair.  
   This pair acts as both their identity and a secure means of encryption.

2. During the first connection, users exchange public keys through a temporary signaling server.  
   The signaling server never sees message contents or encryption keys.

3. Once the handshake completes, a direct peer-to-peer connection is established.  

4. Every message is encrypted before it leaves the sender’s device, using a new one-time key derived from a shared secret.  
   Only the intended recipient can decrypt it.

5. All chat data is stored locally on each device in encrypted form.  

---

## Security Overview

| Layer | Purpose | Technology |
|--------|----------|-------------|
| Message Encryption | Protects message contents and ensures integrity | AES-256-GCM |
| Key Exchange | Creates a shared secret between peers | ECDH (X25519) |
| Key Derivation | Expands shared secrets into usable keys | HKDF (SHA-256) |
| Local Storage | Encrypts messages on the device | Argon2id / scrypt |
| Identity Verification | Confirms peer authenticity | Fingerprint (Trust on First Use) |

---

## Design Philosophy

1. **Ownership** — data belongs entirely to the user.  
2. **Transparency** — all communication steps are open and verifiable.  
3. **Simplicity** — straightforward design that prioritizes security and usability.

---

## Summary

| You Get | You Don’t |
|----------|------------|
| End-to-end encrypted messaging | Centralized accounts |
| Local encrypted storage | Cloud backups |
| Cryptographic identity | Password recovery |
| Direct P2P connections | Server-side data access |

> Your words, your connection, your control.
