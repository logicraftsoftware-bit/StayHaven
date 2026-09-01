import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminsService } from '../admins/admins.service';
import { LoginDto } from './dto/login.dto';
import { AdminStatus } from '../common/enums/status.enum';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../common/enums/role.enum';
@Injectable()
export class AuthService {
  constructor(
    private admins: AdminsService,
    private jwt: JwtService,
    private audit: AuditLogsService,
  ) {}
  async login(dto: LoginDto, context: { ip?: string; userAgent?: string }) {
    const admin = await this.admins.findByEmailWithPassword(dto.email);
    if (
      !admin ||
      admin.status !== AdminStatus.ACTIVE ||
      !(await bcrypt.compare(dto.password, admin.passwordHash))
    )
      throw new UnauthorizedException('Invalid credentials');
    await this.admins.touchLogin(admin);
    await this.audit.record({
      actorId: admin._id,
      actorRole: admin.role,
      action: 'ADMIN_LOGIN',
      entityType: 'ADMIN',
      entityId: admin._id,
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });
    const accessToken = await this.jwt.signAsync({
      sub: String(admin._id),
      role: admin.role,
      permissions: admin.permissions || [],
      siteIds: (admin.siteIds || []).map(String),
    });
    return {
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          adminLevel: admin.adminLevel,
          permissions: admin.permissions || [],
          siteIds: admin.siteIds || [],
          avatar: admin.avatar,
        },
      },
    };
  }
}
