import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { OwnerStatus } from '../common/enums/status.enum';
import { OwnersService } from './owners.service';

describe('OwnersService global identity', () => {
  const dto = {
    name: 'Global Owner',
    email: 'owner@example.com',
    phone: '+919876543210',
    password: 'StrongPass123',
  };

  it('prevents duplicate registration regardless of source site', async () => {
    const model = { exists: jest.fn().mockResolvedValue({ _id: 'existing' }) };
    const service = new OwnersService(
      model as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.register(dto, { siteId: '507f1f77bcf86cd799439011' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(model.exists).toHaveBeenCalledWith({ email: 'owner@example.com' });
  });

  it('returns the controlled duplicate message for a concurrent insert', async () => {
    const model = {
      exists: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockRejectedValue({ code: 11000 }),
    };
    const service = new OwnersService(
      model as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(service.register(dto, {})).rejects.toMatchObject({
      message: 'An owner account already exists. Please log in.',
    });
  });

  it('issues the stable owner id and HOTEL_OWNER role in the JWT', async () => {
    const passwordHash = await bcrypt.hash(dto.password, 4);
    const owner = {
      _id: '507f1f77bcf86cd799439012',
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: 'HOTEL_OWNER',
      status: OwnerStatus.ACTIVE,
      save: jest.fn(),
    };
    const model = {
      findOne: jest.fn(() => ({ select: jest.fn().mockResolvedValue(owner) })),
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('token') };
    const audit = { record: jest.fn() };
    const service = new OwnersService(
      model as never,
      audit as never,
      jwt as never,
      {} as never,
    );
    await service.login({ email: dto.email, password: dto.password }, {});
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: owner._id,
      role: 'HOTEL_OWNER',
    });
  });

  it('rejects suspended owners even with a correct password', async () => {
    const owner = {
      passwordHash: await bcrypt.hash(dto.password, 4),
      status: OwnerStatus.SUSPENDED,
    };
    const model = {
      findOne: jest.fn(() => ({ select: jest.fn().mockResolvedValue(owner) })),
    };
    const service = new OwnersService(
      model as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.login({ email: dto.email, password: dto.password }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
