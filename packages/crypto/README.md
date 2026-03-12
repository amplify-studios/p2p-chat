# @chat/crypto

Crypto utilities for p2p-chat (AES, ECDH, hashing, etc.).

**Note:** This package uses Node's `crypto` module (see `AES.ts`, `ECDH.ts`). When used from the Next.js web app, the client bundle relies on Next.js/Turbopack to provide these APIs in the browser (via polyfills or built-in handling). A production build has been verified to succeed with crypto used in client-side code.
