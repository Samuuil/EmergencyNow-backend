import { Socket } from 'socket.io';

export interface JwtPayload {
  sub: string;
  role: string;
  egn: string;
  iat?: number;
  exp?: number;
}

export interface WsClient extends Socket {
  user?: {
    id: string;
    role: string;
    egn: string;
  };
}
