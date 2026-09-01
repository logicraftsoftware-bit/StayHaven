import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../common/enums/role.enum';
import { AdminsService } from '../../admins/admins.service';
import { AdminStatus } from '../../common/enums/status.enum';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private admins: AdminsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }
  async validate(payload: { sub: string; role: Role }) {
    const admin = await this.admins.findSafe(payload.sub);
    if (admin.status !== AdminStatus.ACTIVE)
      throw new UnauthorizedException('Administrator account is suspended');
    return {
      sub: String(admin._id),
      role: admin.role,
      adminLevel: admin.adminLevel,
      permissions: admin.permissions || [],
      siteIds: (admin.siteIds || []).map(String),
    };
  }
}
