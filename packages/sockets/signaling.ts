// NOTE:
// The following types are based on the `apps/server/server.mjs` file.
// In case of changes to the API these should change as well to avoid conflicts.
// We should maybe consider using typescript for the server too to have a single point of reference.

// Represents a connected peer
export interface Client {
  ws: WebSocket;           // WebSocket connection
  nickname: string;        // Peer nickname
  pubkey: string | null;   // Optional public key
}

// Basic peer info to send to clients
export interface PeerInfo {
  id: string;
  nickname: string;
  pubkey: string | null;
}

// Base structure for any message sent via WebSocket
export interface BaseMessage {
  type: string;
}

// Join message sent by a client to register
export interface JoinMessage extends BaseMessage {
  type: "join";
  id: string;
  nickname?: string;
  pubkey?: string | null;
}

// Welcome message sent back to client after join
export interface WelcomeMessage extends BaseMessage {
  type: "welcome";
  id: string;
  message: string;
}

// Invite message sent to a peer
export interface InviteMessage extends BaseMessage {
  type: "invite";
  from: string;
  room: Room;
  target?: string; // optional when sending
}

// Structure of a room
export interface Room {
  roomId: string;
  name: string;
  type: "single" | "group";
  keys: CredentialsType[];
}

// User credentials stored in the room
export interface CredentialsType {
  userId: string;
  public: string;
}

// WebRTC signaling messages
export interface SignalMessage extends BaseMessage {
  type: "signal" | "offer" | "answer" | "candidate";
  from: string;
  target: string;
  payload: any; // could be RTCSessionDescriptionInit or RTCIceCandidateInit
}

// Peers list message
export interface PeersMessage extends BaseMessage {
  type: "peers";
  peers: PeerInfo[];
}

// Union type for all possible incoming messages from clients
export type IncomingMessage =
  | JoinMessage
  | InviteMessage
  | SignalMessage
  | { type: "peers" }; // request for peer list

// Union type for all possible messages sent to clients
export type OutgoingMessage =
  | WelcomeMessage
  | InviteMessage
  | SignalMessage
  | PeersMessage;

