import { ConfigService } from '@nestjs/config';
import { Role } from '../../common/enums/role.enum';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('test-secret-that-is-long-enough'),
  } as unknown as ConfigService;

  it('accepts a signed hotel owner identity without looking in admins', async () => {
    const admins = { findSafe: jest.fn() };
    const strategy = new JwtStrategy(config, admins as never);

    await expect(
      strategy.validate({ sub: 'owner-id', role: Role.HOTEL_OWNER }),
    ).resolves.toEqual({ sub: 'owner-id', role: Role.HOTEL_OWNER });
    expect(admins.findSafe).not.toHaveBeenCalled();
  });

  it('continues validating administrator identities against admins', async () => {
    const admins = {
      findSafe: jest.fn().mockResolvedValue({
        _id: 'admin-id',
        role: Role.SUPER_ADMIN,
        status: 'ACTIVE',
        permissions: [],
        siteIds: [],
      }),
    };
    const strategy = new JwtStrategy(config, admins as never);

    await expect(
      strategy.validate({ sub: 'admin-id', role: Role.SUPER_ADMIN }),
    ).resolves.toMatchObject({ sub: 'admin-id', role: Role.SUPER_ADMIN });
    expect(admins.findSafe).toHaveBeenCalledWith('admin-id');
  });
});
