import type { Request as ExpressRequest } from 'express';

export interface AuthUser {
  id: number;
  email: string;
}

export interface AuthenticatedRequest extends ExpressRequest {
  user: AuthUser;
}
