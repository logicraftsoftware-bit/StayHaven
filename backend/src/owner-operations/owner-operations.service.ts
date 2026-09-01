import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../common/enums/role.enum';
import { Property } from '../properties/schemas/property.schema';
import { SupportTicketDto, TeamMemberDto } from './dto/owner-operation.dto';
import { SupportTicket } from './schemas/support-ticket.schema';
import { TeamMember } from './schemas/team-member.schema';
@Injectable()
export class OwnerOperationsService {
  constructor(
    @InjectModel(TeamMember.name) private teams: Model<TeamMember>,
    @InjectModel(SupportTicket.name) private tickets: Model<SupportTicket>,
    @InjectModel(Property.name) private properties: Model<Property>,
    private audit: AuditLogsService,
    private jwt: JwtService,
  ) {}
  listTeam(ownerId: string) {
    return this.teams.find({ ownerId }).sort({ createdAt: -1 }).lean();
  }
  async saveTeam(ownerId: string, dto: TeamMemberDto, id?: string) {
    const count = await this.properties.countDocuments({
      _id: { $in: dto.assignedPropertyIds },
      ownerId,
    });
    if (count !== dto.assignedPropertyIds.length)
      throw new ForbiddenException(
        'A selected property does not belong to this owner',
      );
    if (!id && !dto.temporaryPassword)
      throw new BadRequestException('Temporary password is required');
    const { temporaryPassword, ...safeDto } = dto;
    const data: Record<string, unknown> = {
      ...safeDto,
      ownerId: new Types.ObjectId(ownerId),
      assignedPropertyIds: dto.assignedPropertyIds.map(
        (x) => new Types.ObjectId(x),
      ),
    };
    if (temporaryPassword)
      data.passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const member = id
      ? await this.teams.findOneAndUpdate({ _id: id, ownerId }, data, {
          new: true,
          runValidators: true,
        })
      : await this.teams.create(data);
    if (!member) throw new NotFoundException('Team member not found');
    await this.audit.record({
      actorId: new Types.ObjectId(ownerId),
      actorRole: Role.HOTEL_OWNER,
      action: id ? 'TEAM_MEMBER_UPDATED' : 'TEAM_MEMBER_ADDED',
      entityType: 'TEAM_MEMBER',
      entityId: member._id,
    });
    return member;
  }
  async login(email: string, password: string) {
    const member = await this.teams
      .findOne({ email: email.toLowerCase(), status: 'active' })
      .select('+passwordHash');
    if (!member || !(await bcrypt.compare(password, member.passwordHash)))
      throw new UnauthorizedException('Invalid credentials');
    return {
      accessToken: await this.jwt.signAsync({
        sub: String(member._id),
        role: Role.TEAM_MEMBER,
        ownerId: String(member.ownerId),
        permissions: member.permissions,
        propertyIds: member.assignedPropertyIds.map(String),
      }),
      member: {
        id: member._id,
        name: member.name,
        email: member.email,
        permissions: member.permissions,
        assignedPropertyIds: member.assignedPropertyIds,
      },
    };
  }
  listAssigned(user: {
    ownerId: string;
    propertyIds: string[];
    permissions: string[];
  }) {
    if (!user.permissions.includes('VIEW_PROPERTIES'))
      throw new ForbiddenException('VIEW_PROPERTIES permission is required');
    return this.properties
      .find({ ownerId: user.ownerId, _id: { $in: user.propertyIds } })
      .select('-financeLegal -documents')
      .lean();
  }
  listTickets(ownerId: string) {
    return this.tickets.find({ ownerId }).sort({ createdAt: -1 }).lean();
  }
  listAllTickets() {
    return this.tickets.find().sort({ createdAt: -1 }).limit(200).lean();
  }
  async updateTicket(id: string, status: string) {
    const ticket = await this.tickets.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    );
    if (!ticket) throw new NotFoundException('Support ticket not found');
    return ticket;
  }
  async createTicket(ownerId: string, dto: SupportTicketDto) {
    let property: (Property & { _id: Types.ObjectId }) | null = null;
    if (dto.propertyId) {
      property = await this.properties.findOne({
        _id: dto.propertyId,
        ownerId,
      });
      if (!property)
        throw new ForbiddenException('Property does not belong to this owner');
    }
    const ticket = await this.tickets.create({
      ...dto,
      ownerId: new Types.ObjectId(ownerId),
      propertyId: dto.propertyId
        ? new Types.ObjectId(dto.propertyId)
        : undefined,
      siteId: property?.siteId,
    });
    await this.audit.record({
      actorId: new Types.ObjectId(ownerId),
      actorRole: Role.HOTEL_OWNER,
      action: 'SUPPORT_TICKET_CREATED',
      entityType: 'SUPPORT_TICKET',
      entityId: ticket._id,
      siteId: property?.siteId,
    });
    return ticket;
  }
}
