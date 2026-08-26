import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from './schemas/admin.schema';
import { ChangePasswordDto, UpdateAdminDto } from './dto/admin.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../common/enums/role.enum';
@Injectable()
export class AdminsService {
  constructor(
    @InjectModel(Admin.name) private model: Model<Admin>,
    private audit: AuditLogsService,
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
