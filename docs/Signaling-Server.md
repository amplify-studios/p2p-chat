# Signaling Server

`node server.mjs`

## Usage

```js
const ws = new WebSocket("ws://localhost:8080");

const myId = "bob";
const nickname = "Bob";
const pubkey = "bob-public-key";

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "join",
    id: myId,
    nickname,
    pubkey
  }));

  // Request the peer list
  ws.send(JSON.stringify({ type: "getPeers" }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log("Bob received:", msg);

  if (msg.type === "peers") {
    console.log("Peers available:", msg.peers);

    // Send offer to Alice
    ws.send(JSON.stringify({
      type: "offer",
      target: "alice",
      payload: { sdp: "fake-offer-sdp" }
    }));
  }

  if (msg.type === "answer") {
    console.log("Answer received from", msg.from, msg.payload);
  }

  if (msg.type === "candidate") {
    console.log("ICE candidate from", msg.from, msg.payload);
  }
};
```

