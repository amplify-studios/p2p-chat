# Multiple Signaling Servers

## 1. Interconnected signaling servers (federation)

- Each signaling server knows about peers registered with the others.
- When User A (on Server 1) wants to connect with User B (on Server 2), Server 1 forwards the discovery request or maintains a gossip/relay channel with Server 2.
- This is basically federation, like how email or Matrix works.
- Pros: seamless user discovery, users don’t need to know which server their friends are on.
- Cons: adds infrastructure complexity — servers need trust, shared protocol, possibly authentication of inter-server communication.

## 2. Independent signaling servers (simpler)

- Each signaling server is totally isolated.
- Users must explicitly choose which server to connect to (maybe your client lets them select or store multiple).
- If I want to reach you, I must know both:
- Your signaling server address
- Your user ID/credentials on that server
- This is like how IRC used to work (different networks, not automatically connected).
- Pros: simple, scalable, no cross-server coordination.
- Cons: discovery is manual — I can’t just “find” you if we’re not on the same server, unless I already have your credentials.

## 3. Hybrid approach

- Start simple with independent servers (option 2).
- Add optional interconnection later for certain trusted servers (a federation layer).
- Client side could abstract this: you try all known servers until you find the peer.
