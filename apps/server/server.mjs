import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });
const clients = new Map(); // id -> ws

wss.on("connection", (ws) => {
    let clientId = null;

    ws.on("message", (msg) => {
        const data = JSON.parse(msg);

        if (data.type === "join") {
            clientId = data.id;
            clients.set(clientId, ws);
            console.log(`Client joined: ${clientId}`);
        } else if (data.type === "signal") {
            const target = clients.get(data.target);
            if (target) {
                target.send(JSON.stringify({
                    type: "signal",
                    from: clientId,
                    payload: data.payload
                }));
            }
        }
    });

    ws.on("close", () => {
        if (clientId) {
            clients.delete(clientId);
            console.log(`Client left: ${clientId}`);
        }
    });
});

console.log("Signaling server running on ws://localhost:8080");
