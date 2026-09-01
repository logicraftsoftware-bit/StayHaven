import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AdminPermission } from '../enums/admin-permission.enum';

const routePermissions: Array<[RegExp, AdminPermission]> = [
  [/\/admin\/dashboard/, AdminPermission.VIEW_DASHBOARD],
  [/\/admin\/sites\/[^/]+\/pages/, AdminPermission.MANAGE_PAGES],
  [/\/admin\/sites/, AdminPermission.MANAGE_SITES],
  [/\/admin\/properties|\/admin\/property-types/, AdminPermission.MANAGE_PROPERTIES],
  [/\/admin\/owners|\/admin\/support/, AdminPermission.MANAGE_OWNERS],
  [/\/admin\/settings/, AdminPermission.MANAGE_API_SETTINGS],
  [/\/admin\/media/, AdminPermission.MANAGE_PROPERTIES],
];
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles?.length) return true;
    const request = ctx.switchToHttp().getRequest<{
      user?: { role: Role; permissions?: string[]; siteIds?: string[] };
      originalUrl?: string;
    }>();
    const user = request.user;
    if (!user) return false;
    if (roles.includes(user.role)) return true;
    if (user.role !== Role.ADMIN || !roles.includes(Role.SUPER_ADMIN)) return false;
    const url = request.originalUrl || '';
    const required = routePermissions.find(([pattern]) => pattern.test(url))?.[1];
    return !!required && !!user.permissions?.includes(required);
  }
}
