import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

// Store clients: id -> { ws, nickname, pubkey }
const clients = new Map();

wss.on("connection", (ws) => {
    let clientId = null;

    ws.on("message", (msg) => {
        let data;
        try {
            data = JSON.parse(msg);
        } catch (e) {
            console.error("Invalid JSON:", msg);
            return;
        }

        switch (data.type) {
            case "join": {
                clientId = data.id;
                clients.set(clientId, {
                    ws,
                    nickname: data.nickname || "Anonymous",
                    pubkey: data.pubkey || null
                });

                console.log(`Client joined: ${clientId} (${data.nickname})`);

                // Send ACK back
                ws.send(JSON.stringify({
                    type: "welcome",
                    id: clientId,
                    message: "Joined signaling server successfully"
                }));

                // Broadcast updated peer list
                broadcastPeerList();
                break;
            }

            case "signal": {
                const target = clients.get(data.target);
                if (target) {
                    target.ws.send(JSON.stringify({
                        type: "signal",
                        from: clientId,
                        payload: data.payload
                    }));
                }
                break;
            }

            case "offer":
            case "answer":
            case "candidate": {
                // WebRTC standard signaling
                const target = clients.get(data.target);
                if (target) {
                    target.ws.send(JSON.stringify({
                        type: data.type,
                        from: clientId,
                        payload: data.payload
                    }));
                }
                break;
            }

            case "getPeers": {
                // Return peer list to requester
                ws.send(JSON.stringify({
                    type: "peers",
                    peers: getPeerList()
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
    return Array.from(clients.entries()).map(([id, { nickname, pubkey }]) => ({
        id,
        nickname,
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
