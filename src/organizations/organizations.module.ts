import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { InvitationService } from './services/invitation.service';
import { TeamRoleService } from './services/team-role.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { BillingModule } from '../billing/billing.module';
import { BrevoModule } from '../external-service/brevo/brevo.module';

@Module({
  imports: [PrismaModule, CommonModule, BillingModule, BrevoModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, InvitationService, TeamRoleService],
  exports: [OrganizationsService, InvitationService, TeamRoleService],
})
export class OrganizationsModule {}
