// TODO: load these servers from a config file

export const STUN_SERVERS = [
  "stun:stun.l.google.com:19302",
  "stun:stun.l.google.com:5349",
  "stun:stun1.l.google.com:3478",
];

export const TURN_SERVERS = [
  // TODO: add or own self-hosted TURN Sercer. See https://github.com/coturn/coturn
  // {
  //   urls: "turn:your-turn-server.com:3478",
  //   username: "user",
  //   credential: "pass",
  // },
  {
    urls: "turn:numb.viagenie.ca:3478",
    username: "webrtc@live.com", // public test account
    credential: "muazkh",        // public test password
  },
];
