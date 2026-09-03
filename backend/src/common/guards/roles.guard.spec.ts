import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '../enums/role.enum';
import { AdminPermission } from '../enums/admin-permission.enum';
describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const context = (role: Role) =>
    ({
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    }) as unknown as ExecutionContext;
  it('allows a super admin', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.SUPER_ADMIN]);
    expect(guard.canActivate(context(Role.SUPER_ADMIN))).toBe(true);
  });
  it('rejects a customer', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.SUPER_ADMIN]);
    expect(guard.canActivate(context(Role.CUSTOMER))).toBe(false);
  });
  it('allows a delegated admin only for an assigned route permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.SUPER_ADMIN]);
    const delegated = (permissions: string[], originalUrl: string) =>
      ({
        getHandler: () => null,
        getClass: () => null,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { role: Role.ADMIN, permissions },
            originalUrl,
          }),
        }),
      }) as unknown as ExecutionContext;
    expect(
      guard.canActivate(
        delegated(
          [AdminPermission.MANAGE_PROPERTIES],
          '/api/v1/admin/properties',
        ),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        delegated(
          [AdminPermission.MANAGE_ROOM_TYPES],
          '/api/v1/admin/property-types',
        ),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        delegated([AdminPermission.MANAGE_PROPERTIES], '/api/v1/admin/sites'),
      ),
    ).toBe(false);
  });
});
