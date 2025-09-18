export interface MessageType {
  roomId: string;
  senderId: string;
  message: string;
};

export interface CredentialsType {
  userId: string;
  public: string;
  private: string;
  username: string;
}
