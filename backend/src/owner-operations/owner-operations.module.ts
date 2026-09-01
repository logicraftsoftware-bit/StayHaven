import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import {
  Property,
  PropertySchema,
} from '../properties/schemas/property.schema';
import {
  AdminSupportController,
  OwnerOperationsController,
  TeamMemberController,
} from './owner-operations.controller';
import { OwnerOperationsService } from './owner-operations.service';
import {
  SupportTicket,
  SupportTicketSchema,
} from './schemas/support-ticket.schema';
import { TeamMember, TeamMemberSchema } from './schemas/team-member.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TeamMember.name, schema: TeamMemberSchema },
      { name: SupportTicket.name, schema: SupportTicketSchema },
      { name: Property.name, schema: PropertySchema },
    ]),
    AuditLogsModule,
    AuthModule,
  ],
  controllers: [
    OwnerOperationsController,
    TeamMemberController,
    AdminSupportController,
  ],
  providers: [OwnerOperationsService],
})
export class OwnerOperationsModule {}
