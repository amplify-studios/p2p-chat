export interface MessageType {
  roomId: string;
  senderId: string;
  message: string; // FIXME: Should be bytes
};

export interface CredentialsType {
  userId: string;
  public: string; // FIXME: Should be bytes
  private: string; // FIXME: Should be bytes
  username: string;
};

export interface RoomType {
  roomId: string;
  name: string;
  type: "single" | "group";
  keys: string[]; // FIXME: Should be bytes
};
