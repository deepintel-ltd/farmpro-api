import { PrismaClient } from '@prisma/client';

export interface PermissionContext {
  organizationId?: string;
  farmId?: string;
}

export interface HasPermissionParams {
  prisma: PrismaClient;
  userId: string;
  resource: string;
  action: string;
  context?: PermissionContext;
}

/**
 * Utility function to check if a user has a specific permission with scope enforcement
 * 
 * @param params - Permission check parameters
 * @returns Promise<boolean> - Whether the user has the permission
 */
export async function hasPermission({
  prisma,
  userId,
  resource,
  action,
  context,
}: HasPermissionParams): Promise<boolean> {
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  return userRoles.some(userRole => {
    // Check if role has the permission
    const hasPermission = userRole.role.permissions.some(rolePermission =>
      rolePermission.permission.resource === resource &&
      rolePermission.permission.action === action &&
      rolePermission.granted
    );

    if (!hasPermission) return false;

    // Enforce scope-based access control
    switch (userRole.role.scope) {
      case 'PLATFORM':
        // Platform admins can access everything
        return true;
      
      case 'ORGANIZATION':
        // Organization-scoped roles can only access their organization
        if (!context?.organizationId) {
          return false;
        }
        return userRole.role.organizationId === context.organizationId;
      
      case 'FARM':
        // Farm-scoped roles can only access their specific farm
        if (!context?.farmId) {
          return false;
        }
        return userRole.farmId === context.farmId;
      
      default:
        return false;
    }
  });
}

/**
 * Check if user has organization-level access (ORGANIZATION or PLATFORM scope)
 * 
 * @param userRoles - User's roles array
 * @returns boolean - Whether user has organization-level access
 */
export function hasOrganizationScope(userRoles: Array<{ scope: string }>): boolean {
  return userRoles.some(role => 
    role.scope === 'ORGANIZATION' || role.scope === 'PLATFORM'
  );
}

/**
 * Check if user has farm-level access for a specific farm
 * 
 * @param userRoles - User's roles array
 * @param farmId - Target farm ID
 * @returns boolean - Whether user has access to the farm
 */
export function hasFarmAccess(
  userRoles: Array<{ scope: string; farmId?: string }>, 
  farmId: string
): boolean {
  return userRoles.some(role => {
    if (role.scope === 'PLATFORM') return true; // Platform admins can access any farm
    if (role.scope === 'ORGANIZATION') return true; // Organization-scoped roles can access any farm in their org
    if (role.scope === 'FARM') return role.farmId === farmId; // Farm-scoped roles can only access their specific farm
    return false;
  });
}
