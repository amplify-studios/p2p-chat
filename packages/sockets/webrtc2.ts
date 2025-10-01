import { useEffect, useRef, useState } from "react";

type SignalMessage =
    | { sdp: RTCSessionDescriptionInit }
    | { candidate: RTCIceCandidateInit };

export function setupPeerConnection() {
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    // connect to signaling server
    socketRef.current = new WebSocket("wss://localhost:8080");

        socketRef.current.onmessage = async (event: MessageEvent) => {
            const data: SignalMessage = JSON.parse(event.data);

            if ("sdp" in data) {
                await pcRef.current?.setRemoteDescription(new RTCSessionDescription(data.sdp));
                if (data.sdp.type === "offer") {
                    const answer = await pcRef.current!.createAnswer();
                    await pcRef.current!.setLocalDescription(answer);
                    socketRef.current?.send(JSON.stringify({ sdp: pcRef.current!.localDescription }));
                }
            } else if ("candidate" in data) {
                try {
                    await pcRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                    console.error("Error adding candidate", err);
                }
            }
        };

        // setup peer connection
        pcRef.current = new RTCPeerConnection();

        pcRef.current.onicecandidate = (e) => {
            if (e.candidate) {
                socketRef.current?.send(JSON.stringify({ candidate: e.candidate }));
            }
        };

        // create data channel
        const dc = pcRef.current.createDataChannel("chat");
        dcRef.current = dc;
        dc.onmessage = (e) => {
            console.log("Peer: " + e.data);
            // setMessages((prev) => [...prev, `Peer: ${e.data}`]);
        };

        // if the other peer creates a channel
        pcRef.current.ondatachannel = (event) => {
            event.channel.onmessage = (e) => {
                console.log("Peer: " + e.data);
                // setMessages((prev) => [...prev, `Peer: ${e.data}`]);
            };
        };

        return {pcRef, dcRef, socketRef};
}

export async function startConnection(pcRef: any, socketRef: any) {
    if (!pcRef.current) return;
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socketRef.current?.send(JSON.stringify({ sdp: pcRef.current.localDescription }));
}


//     const sendMessage = () => {
//         if (!dcRef.current || dcRef.current.readyState !== "open") return;
//         dcRef.current.send(input);
//         setMessages((prev) => [...prev, `Me: ${input}`]);
//         setInput("");
//     };

// export default function Home() {
//     const [messages, setMessages] = useState<string[]>([]);
//     const [input, setInput] = useState("");

//     const pcRef = useRef<RTCPeerConnection | null>(null);
//     const dcRef = useRef<RTCDataChannel | null>(null);
//     const socketRef = useRef<WebSocket | null>(null);

//     useEffect(() => {
//         // connect to signaling server
//         socketRef.current = new WebSocket("wss://YOUR_SIGNALING_SERVER_URL");

//         socketRef.current.onmessage = async (event: MessageEvent) => {
//             const data: SignalMessage = JSON.parse(event.data);

//             if ("sdp" in data) {
//                 await pcRef.current?.setRemoteDescription(new RTCSessionDescription(data.sdp));
//                 if (data.sdp.type === "offer") {
//                     const answer = await pcRef.current!.createAnswer();
//                     await pcRef.current!.setLocalDescription(answer);
//                     socketRef.current?.send(JSON.stringify({ sdp: pcRef.current!.localDescription }));
//                 }
//             } else if ("candidate" in data) {
//                 try {
//                     await pcRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
//                 } catch (err) {
//                     console.error("Error adding candidate", err);
//                 }
//             }
//         };

//         // setup peer connection
//         pcRef.current = new RTCPeerConnection();

//         pcRef.current.onicecandidate = (e) => {
//             if (e.candidate) {
//                 socketRef.current?.send(JSON.stringify({ candidate: e.candidate }));
//             }
//         };

//         // create data channel
//         const dc = pcRef.current.createDataChannel("chat");
//         dcRef.current = dc;
//         dc.onmessage = (e) => {
//             setMessages((prev) => [...prev, `Peer: ${e.data}`]);
//         };

//         // if the other peer creates a channel
//         pcRef.current.ondatachannel = (event) => {
//             event.channel.onmessage = (e) => {
//                 setMessages((prev) => [...prev, `Peer: ${e.data}`]);
//             };
//         };

//         return () => {
//             socketRef.current?.close();
//             pcRef.current?.close();
//         };
//     }, []);

//     const startConnection = async () => {
//         if (!pcRef.current) return;
//         const offer = await pcRef.current.createOffer();
//         await pcRef.current.setLocalDescription(offer);
//         socketRef.current?.send(JSON.stringify({ sdp: pcRef.current.localDescription }));
//     };

//     const sendMessage = () => {
//         if (!dcRef.current || dcRef.current.readyState !== "open") return;
//         dcRef.current.send(input);
//         setMessages((prev) => [...prev, `Me: ${input}`]);
//         setInput("");
//     };

    
// }
