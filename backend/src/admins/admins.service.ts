import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from './schemas/admin.schema';
import {
  ChangePasswordDto,
  CreateManagedAdminDto,
  UpdateAdminDto,
  UpdateManagedAdminDto,
} from './dto/admin.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../common/enums/role.enum';
import {
  AdminPermission,
  ALL_ADMIN_PERMISSIONS,
} from '../common/enums/admin-permission.enum';
import { Types } from 'mongoose';
import { SitesService } from '../sites/sites.service';
@Injectable()
export class AdminsService {
  constructor(
    @InjectModel(Admin.name) private model: Model<Admin>,
    private audit: AuditLogsService,
    private sites: SitesService,
  ) {}
  findByEmailWithPassword(email: string) {
    return this.model
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash')
      .exec();
  }
  async findSafe(id: string) {
    const admin = await this.model.findById(id).exec();
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }
  async update(id: string, dto: UpdateAdminDto) {
    const admin = await this.model.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }
  private allowedPermissions(actor: AdminDocument) {
    return actor.role === Role.SUPER_ADMIN
      ? ALL_ADMIN_PERMISSIONS
      : ((actor.permissions || []) as AdminPermission[]);
  }
  private assertCanManage(
    actor: AdminDocument,
    permissions: AdminPermission[],
    siteIds: string[],
  ) {
    if (
      actor.role !== Role.SUPER_ADMIN &&
      (actor.adminLevel !== 'MAIN_ADMIN' ||
        !actor.permissions?.includes(AdminPermission.MANAGE_USERS))
    )
      throw new ForbiddenException('User management permission is required');
    const allowed = new Set(this.allowedPermissions(actor));
    if (permissions.some((permission) => !allowed.has(permission)))
      throw new ForbiddenException(
        'You cannot grant a permission you do not have',
      );
    if (actor.role !== Role.SUPER_ADMIN && actor.adminLevel !== 'MAIN_ADMIN') {
      const sites = new Set((actor.siteIds || []).map(String));
      if (siteIds.some((siteId) => !sites.has(siteId)))
        throw new ForbiddenException(
          'You cannot assign a site you do not manage',
        );
    }
  }
  private async actor(id: string) {
    const actor = await this.model.findById(id).select('+passwordHash');
    if (!actor) throw new NotFoundException('Administrator not found');
    return actor;
  }
  async listManaged(actorId: string) {
    const actor = await this.actor(actorId);
    if (
      actor.role !== Role.SUPER_ADMIN &&
      (actor.adminLevel !== 'MAIN_ADMIN' ||
        !actor.permissions?.includes(AdminPermission.MANAGE_USERS))
    )
      throw new ForbiddenException('User management permission is required');
    const filter =
      actor.role === Role.SUPER_ADMIN
        ? { _id: { $ne: actor._id } }
        : { createdBy: actor._id };
    return this.model
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('siteIds', 'name domain city')
      .exec();
  }
  async listAssignableSites(actorId: string) {
    const actor = await this.actor(actorId);
    if (
      actor.role !== Role.SUPER_ADMIN &&
      (actor.adminLevel !== 'MAIN_ADMIN' ||
        !actor.permissions?.includes(AdminPermission.MANAGE_USERS))
    )
      throw new ForbiddenException('User management permission is required');
    return this.sites.list(
      actor.role === Role.SUPER_ADMIN || actor.adminLevel === 'MAIN_ADMIN'
        ? undefined
        : (actor.siteIds || []).map(String),
    );
  }
  async createManaged(actorId: string, dto: CreateManagedAdminDto) {
    const actor = await this.actor(actorId);
    if (actor.role !== Role.SUPER_ADMIN && dto.adminLevel === 'MAIN_ADMIN')
      throw new ForbiddenException(
        'Only the Super Admin can create a main admin',
      );
    if (
      dto.adminLevel === 'MAIN_ADMIN' &&
      (await this.model.exists({ role: Role.ADMIN, adminLevel: 'MAIN_ADMIN' }))
    )
      throw new BadRequestException('Only one main admin can be created');
    if (
      dto.adminLevel !== 'MAIN_ADMIN' &&
      dto.permissions.includes(AdminPermission.MANAGE_USERS)
    )
      throw new ForbiddenException(
        'User management can only be assigned to a main admin',
      );
    this.assertCanManage(actor, dto.permissions, dto.siteIds);
    if (await this.model.exists({ email: dto.email.toLowerCase() }))
      throw new BadRequestException(
        'An administrator with this email already exists',
      );
    const admin = await this.model.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash: await bcrypt.hash(dto.password, 12),
      role: Role.ADMIN,
      adminLevel: dto.adminLevel,
      permissions: dto.permissions,
      siteIds:
        dto.adminLevel === 'MAIN_ADMIN'
          ? []
          : dto.siteIds.map((id) => new Types.ObjectId(id)),
      createdBy: actor._id,
      avatar: dto.avatar,
    });
    await this.audit.record({
      actorId: actor._id,
      actorRole: actor.role,
      action: 'ADMIN_CREATED',
      entityType: 'ADMIN',
      entityId: admin._id,
    });
    return this.findSafe(String(admin._id));
  }
  async updateManaged(actorId: string, id: string, dto: UpdateManagedAdminDto) {
    const actor = await this.actor(actorId);
    const target = await this.model.findById(id).select('+passwordHash');
    if (!target || target.role === Role.SUPER_ADMIN)
      throw new NotFoundException('Managed administrator not found');
    if (
      actor.role !== Role.SUPER_ADMIN &&
      String(target.createdBy) !== String(actor._id)
    )
      throw new ForbiddenException('You can only manage users you created');
    if (actor.role !== Role.SUPER_ADMIN && dto.adminLevel === 'MAIN_ADMIN')
      throw new ForbiddenException(
        'Only the Super Admin can assign the main admin level',
      );
    if (
      dto.adminLevel === 'MAIN_ADMIN' &&
      target.adminLevel !== 'MAIN_ADMIN' &&
      (await this.model.exists({
        role: Role.ADMIN,
        adminLevel: 'MAIN_ADMIN',
        _id: { $ne: target._id },
      }))
    )
      throw new BadRequestException('Only one main admin can be created');
    const permissions =
      dto.permissions || (target.permissions as AdminPermission[]) || [];
    const siteIds = dto.siteIds || (target.siteIds || []).map(String);
    if (
      (dto.adminLevel || target.adminLevel) !== 'MAIN_ADMIN' &&
      permissions.includes(AdminPermission.MANAGE_USERS)
    )
      throw new ForbiddenException(
        'User management can only be assigned to a main admin',
      );
    this.assertCanManage(actor, permissions, siteIds);
    if (dto.password) target.passwordHash = await bcrypt.hash(dto.password, 12);
    if (dto.name !== undefined) target.name = dto.name;
    if (dto.adminLevel !== undefined) target.adminLevel = dto.adminLevel;
    if (dto.permissions !== undefined) target.permissions = dto.permissions;
    if (dto.adminLevel === 'MAIN_ADMIN') target.siteIds = [];
    else if (dto.siteIds !== undefined)
      target.siteIds = dto.siteIds.map((siteId) => new Types.ObjectId(siteId));
    if (dto.status !== undefined) target.status = dto.status;
    if (dto.avatar !== undefined) target.avatar = dto.avatar;
    await target.save();
    await this.audit.record({
      actorId: actor._id,
      actorRole: actor.role,
      action: 'ADMIN_UPDATED',
      entityType: 'ADMIN',
      entityId: target._id,
    });
    return this.findSafe(String(target._id));
  }
  async deleteManaged(actorId: string, id: string) {
    const actor = await this.actor(actorId);
    const target = await this.model.findById(id);
    if (!target || target.role === Role.SUPER_ADMIN)
      throw new NotFoundException('Managed administrator not found');
    if (
      actor.role !== Role.SUPER_ADMIN &&
      (actor.adminLevel !== 'MAIN_ADMIN' ||
        String(target.createdBy) !== String(actor._id))
    )
      throw new ForbiddenException('You can only delete users you created');
    await target.deleteOne();
    await this.audit.record({
      actorId: actor._id,
      actorRole: actor.role,
      action: 'ADMIN_DELETED',
      entityType: 'ADMIN',
      entityId: target._id,
    });
  }
  async changePassword(id: string, dto: ChangePasswordDto) {
    const admin = await this.model.findById(id).select('+passwordHash');
    if (!admin) throw new NotFoundException('Admin not found');
    if (!(await bcrypt.compare(dto.currentPassword, admin.passwordHash)))
      throw new UnauthorizedException('Current password is incorrect');
    admin.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await admin.save();
    await this.audit.record({
      actorId: admin._id,
      actorRole: Role.SUPER_ADMIN,
      action: 'ADMIN_PASSWORD_CHANGED',
      entityType: 'ADMIN',
      entityId: admin._id,
    });
  }
  async touchLogin(admin: AdminDocument) {
    admin.lastLoginAt = new Date();
    await admin.save();
  }
  async createSeed(name: string, email: string, password: string) {
    const exists = await this.model.exists({ email: email.toLowerCase() });
    if (exists) return false;
    await this.model.create({
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      role: Role.SUPER_ADMIN,
    });
    return true;
  }
}
