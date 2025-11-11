export interface Room {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  peers: Set<string>;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  payload: unknown;
}
