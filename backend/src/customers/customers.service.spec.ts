import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CustomersService } from './customers.service';

jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));
describe('CustomersService', () => {
  const jwt = { signAsync: jest.fn().mockResolvedValue('customer-token') };
  it('keeps duplicate customer registration safe', async () => {
    const model = { exists: jest.fn().mockResolvedValue(true) };
    const service = new CustomersService(model as never, jwt as never);
    await expect(
      service.register({
        name: 'Guest User',
        email: 'guest@example.com',
        password: 'password123',
        acceptTerms: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('rejects invalid customer credentials', async () => {
    const query = {
      select: jest
        .fn()
        .mockResolvedValue({ passwordHash: 'hash', active: true }),
    };
    const model = { findOne: jest.fn(() => query) };
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const service = new CustomersService(model as never, jwt as never);
    await expect(
      service.login({ email: 'guest@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
