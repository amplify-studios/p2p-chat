// TODO: load these servers from a config file

export const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun.l.google.com:5349',
  'stun:stun1.l.google.com:3478',
];

export const TURN_SERVERS = [
  // TODO: add or own self-hosted TURN Sercer. See https://github.com/coturn/coturn
  // {
  //   urls: "turn:your-turn-server.com:3478",
  //   username: "user",
  //   credential: "pass",
  // },
  {
    urls: 'turn:192.158.29.39:3478?transport=udp',
    credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
    username: '28224511:1379330808',
  },
  {
    urls: 'turn:192.158.29.39:3478?transport=tcp',
    credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
    username: '28224511:1379330808',
  },
  {
    urls: 'turn:turn.bistri.com:80',
    credential: 'homeo',
    username: 'homeo',
  },
];
