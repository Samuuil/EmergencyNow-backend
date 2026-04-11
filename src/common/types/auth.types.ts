import { Role } from '../enums/role.enum';

export interface JwtPayload {
  sub: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
