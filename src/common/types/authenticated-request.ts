import { Request as ExpressRequest } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

export interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
  file?: any;
}
