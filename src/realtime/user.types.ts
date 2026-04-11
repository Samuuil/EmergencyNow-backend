import { Socket } from 'socket.io';

export interface JwtPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface UserSocket extends Socket {
  user?: {
    id: string;
    role: string;
  };
}
