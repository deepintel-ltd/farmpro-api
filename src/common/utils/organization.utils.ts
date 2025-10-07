import { PrismaClient } from '@prisma/client';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

export interface OrganizationInfo {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

export interface SelectableOrganization {
  id: string;
  name: string;
  type: string;
  plan: string;
  isVerified: boolean;
  createdAt: Date;
  userCount: number;
  farmCount: number;
}

/**
 * Validate that a platform admin can access the specified organization
 * 
 * @param prisma - Prisma client instance
 * @param organizationId - Organization ID to validate
 * @param user - Current user context
 * @returns Organization info if valid, null if invalid
 */
export async function validateOrganizationAccess(
  prisma: PrismaClient,
  organizationId: string,
  user: CurrentUser,
): Promise<OrganizationInfo | null> {
  if (!user.isPlatformAdmin) {
    throw new Error('Only platform admins can select organizations');
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        suspendedAt: true,
      },
    });

    if (!organization) {
      return null;
    }

    if (!organization.isActive || organization.suspendedAt) {
      return null;
    }

    return {
      id: organization.id,
      name: organization.name,
      type: organization.type,
      isActive: organization.isActive,
    };
  } catch {
    return null;
  }
}

/**
 * Get all organizations that a platform admin can access
 * 
 * @param prisma - Prisma client instance
 * @param user - Current user context
 * @returns Array of selectable organizations
 */
export async function getSelectableOrganizations(
  prisma: PrismaClient,
  user: CurrentUser,
): Promise<SelectableOrganization[]> {
  if (!user.isPlatformAdmin) {
    throw new Error('Only platform admins can access organization list');
  }

  const organizations = await prisma.organization.findMany({
    where: {
      isActive: true,
      suspendedAt: null,
    },
    select: {
      id: true,
      name: true,
      type: true,
      plan: true,
      isVerified: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
          farms: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return organizations.map(org => ({
    id: org.id,
    name: org.name,
    type: org.type,
    plan: org.plan,
    isVerified: org.isVerified,
    createdAt: org.createdAt,
    userCount: org._count.users,
    farmCount: org._count.farms,
  }));
}
