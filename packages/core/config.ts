export const CLIENT_CONFIG = {
  "appName": "P2P Chat",
  "stunServers": {
    "urls": [
      "stun:stun.l.google.com:19302",
      "stun:stun.l.google.com:5349",
      "stun:stun1.l.google.com:3478"
    ]
  },
  "turnServers": [
    {
      "urls": "turn:192.168.1.25:3478",
      "username": "p2p",
      "credential": ""
    }
  ],
  "signalingUrl": "wss://p2p-signaling-55197d11d9bf.herokuapp.com/"
};
