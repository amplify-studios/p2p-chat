import { WebSocketServer } from "ws";
import http from "http";

const PORT = process.env.PORT || 8080;

// Create a basic HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("WebSocket signaling server is running\n");
});

// Attach WebSocket server to the HTTP server
const wss = new WebSocketServer({ server });

const clients = new Map();

wss.on("connection", (ws) => {
  let clientId = null;

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg.toString());
    } catch (e) {
      console.error("Invalid JSON:", msg);
      return;
    }

    switch (data.type) {
      case "join": {
        clientId = data.id;
        clients.set(clientId, {
          ws,
          username: data.username || "Anonymous",
          pubkey: data.pubkey || null
        });

        console.log(`Client joined: ${clientId} (${data.username})`);

        ws.send(JSON.stringify({
          type: "welcome",
          id: clientId,
          message: "Joined signaling server successfully"
        }));

        broadcastPeerList();
        break;
      }

      case "invite": {
        const target = clients.get(data.target);
        if (target) {
          target.ws.send(JSON.stringify({
            type: "invite",
            from: clientId,
            name: data.payload.name,
            roomType: data.payload.roomType,
            pubkey: data.payload.pubkey
          }));
        }
        break;
      }

      case "ack": {
        const target = clients.get(data.target);
        if(target) {
          target.ws.send(JSON.stringify({
            type: "ack",
            from: clientId,
            room: data.payload.room
          }));
        }
        break;
      }

      case "peers": {
        for (const { ws } of clients.values()) {
          ws.send(JSON.stringify({ type: "peers", peers: getPeerList() }));
        }
        break;
      }

      case "signal": 
      case "answer": 
      case "offer": {
        const target = clients.get(data.target);
        if (!target || target.ws.readyState !== target.ws.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: "Target not found or disconnected" }));
          break;
        }

        // Basic validation
        if (data.type === "offer" || data.type === "answer") {
          if (!data.payload?.sdp) {
            console.warn(`Invalid ${data.type} payload`, data.payload);
            break;
          }
        } else if (data.type === "candidate") {
          if (!data.payload?.candidate) {
            console.warn("Invalid ICE candidate payload", data.payload);
            break;
          }
        }

        target.ws.send(JSON.stringify({
          type: data.type,
          from: clientId,
          payload: data.payload
        }));
        break;
      }

      default:
        console.warn("Unknown message type:", data.type);
    }
  });

  ws.on("close", () => {
    if (clientId) {
      clients.delete(clientId);
      console.log(`Client left: ${clientId}`);
      broadcastPeerList();
    }
  });
});

function getPeerList() {
  return Array.from(clients.entries()).map(([id, { username, pubkey }]) => ({
    id,
    username,
    pubkey
  }));
}

function broadcastPeerList() {
  const peers = getPeerList();
  for (const { ws } of clients.values()) {
    ws.send(JSON.stringify({
      type: "peers",
      peers
    }));
  }
}

console.log("Signaling server running on ws://localhost:8080");

server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
