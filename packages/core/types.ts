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
  name: string; // encrypt
  public: string;
  type: 'single' | 'group';
}

export interface BlockType {
  userId: string;
  username: string;
}

export interface ServerSettingsType {
  useSelect: boolean,
  autoSelectAll: boolean, 
  selectedServers: string[], // encrypt
  useUser: boolean, 
  userServers: string[], 
  shareFederation: boolean
}

export type Type = MessageType | CredentialsType | RoomType | InviteType | BlockType | ServerSettingsType;
