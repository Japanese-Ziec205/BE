import type { Role } from '../constants/permissions';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      role: Role;
      perms: string[];
      tokenVersion: number;
    }

    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

export {};
