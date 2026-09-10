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
  it('selects the login OTP flow and exposes password availability for an existing customer', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ passwordHash: 'hash', active: true }),
    };
    const model = { findOne: jest.fn(() => query) };
    const service = new CustomersService(
      model as never,
      {} as never,
      jwt as never,
      {} as never,
    );
    jest.spyOn(service, 'requestOtp').mockResolvedValue({
      phone: '+91 masked',
      expiresIn: 600,
      resendAfter: 60,
    });
    await expect(
      service.requestAccessOtp({ phone: '9876543210' }),
    ).resolves.toMatchObject({
      purpose: 'login',
      existingAccount: true,
      passwordAvailable: true,
    });
  });
  it('selects registration and no password option for a new mobile number', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    };
    const model = { findOne: jest.fn(() => query) };
    const service = new CustomersService(
      model as never,
      {} as never,
      jwt as never,
      {} as never,
    );
    jest.spyOn(service, 'requestOtp').mockResolvedValue({
      phone: '+91 masked',
      expiresIn: 600,
      resendAfter: 60,
    });
    await expect(
      service.requestAccessOtp({ phone: '9876543210' }),
    ).resolves.toMatchObject({
      purpose: 'register',
      existingAccount: false,
      passwordAvailable: false,
    });
  });
});
