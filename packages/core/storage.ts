export interface MessageType {
  roomId: string;
  senderId: string;
  message: Buffer;
};

export interface CredentialsType {
  id: string;
  public: Buffer;
  private: Buffer;
  username: string;
}
