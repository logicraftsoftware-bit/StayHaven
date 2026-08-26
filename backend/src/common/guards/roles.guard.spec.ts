import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '../enums/role.enum';
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
});
