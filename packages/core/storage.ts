export interface MessageType {
  roomId: string; // encrypt
  senderId: string; // encrypt
  message: string; // encrypt
  read: boolean;
  timestamp: number;
}

export interface CredentialsType {
  userId: string;
  public: string;
  private?: string; // encrypt
  username: string; // encrypt
}

export interface RoomType {
  roomId: string;
  name: string; // encrypt
  type: 'single' | 'group';
  keys: CredentialsType[]; // encrypt
}

export interface InviteType {
  inviteId: string;
  from: string; // encrypt
  room: RoomType; // encrypt
}

export interface BlockType {
  userId: string;
}

export type StorageType = MessageType | CredentialsType | RoomType | InviteType | BlockType;
