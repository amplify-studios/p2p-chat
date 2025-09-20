export interface MessageType {
  roomId: string;
  senderId: string;
  message: string; // FIXME: Should be bytes
  timestamp: number;
}

export interface CredentialsType {
  userId: string;
  public: Uint8Array
  private?: Uint8Array
  username: string;
}

export interface RoomType {
  roomId: string;
  name: string;
  type: 'single' | 'group';
  keys: CredentialsType[];
}
