import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OrganizationType, RoleScope } from '@prisma/client';

export interface CurrentUser {
  userId: string;
  email: string;
  name: string;
  organizationId: string | null; // Optional for platform admins

  // Enhanced authorization context
  isPlatformAdmin: boolean;
  roles: Array<{
    id: string;
    name: string;
    level: number;
    scope: RoleScope;
    farmId?: string;
  }>;

  organization: {
    id: string;
    name: string;
    type: OrganizationType;
    plan: string;
    features: string[];
    allowedModules: string[];
    isVerified: boolean;
    isSuspended: boolean;
  } | null; // Optional for platform admins

  permissions: string[];  // Flattened list of permissions (resource:action)
  capabilities: string[]; // Organization type capabilities
}

export const GetCurrentUser = createParamDecorator(
  (data: keyof CurrentUser | undefined, ctx: ExecutionContext): CurrentUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
