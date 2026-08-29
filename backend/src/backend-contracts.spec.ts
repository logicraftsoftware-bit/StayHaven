/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AdminsService } from './admins/admins.service';
import { AuditLogsService } from './audit-logs/audit-logs.service';
import { AuthService } from './auth/auth.service';
import {
  AdminStatus,
  OwnerStatus,
  PropertyStatus,
} from './common/enums/status.enum';
import { Role } from './common/enums/role.enum';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { OwnersService } from './owners/owners.service';
import { PropertiesService } from './properties/properties.service';
import { SitesService } from './sites/sites.service';

describe('Backend security and workflow contracts', () => {
  it('creates the initial admin seed once with a hashed password', async () => {
    const model = {
      exists: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };
    const service = new AdminsService(model as never, {} as never);
    expect(
      await service.createSeed('Admin', 'ADMIN@example.com', 'StrongPass1!'),
    ).toBe(true);
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@example.com',
        role: Role.SUPER_ADMIN,
        passwordHash: expect.not.stringMatching(/^StrongPass1!$/),
      }),
    );
  });

  it('logs in an active admin and issues a JWT', async () => {
    const passwordHash = await bcrypt.hash('StrongPass1!', 4);
    const admin = {
      _id: new Types.ObjectId(),
      name: 'Admin',
      email: 'a@b.com',
      role: Role.SUPER_ADMIN,
      status: AdminStatus.ACTIVE,
      passwordHash,
    };
    const admins = {
      findByEmailWithPassword: jest.fn().mockResolvedValue(admin),
      touchLogin: jest.fn(),
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('token') };
    const audit = { record: jest.fn() };
    const result = await new AuthService(
      admins as never,
      jwt as never,
      audit as never,
    ).login({ email: admin.email, password: 'StrongPass1!' }, {});
    expect(result.data.accessToken).toBe('token');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ADMIN_LOGIN' }),
    );
  });

  it('rejects a wrong password', async () => {
    const admin = {
      status: AdminStatus.ACTIVE,
      passwordHash: await bcrypt.hash('correct-password', 4),
    };
    const service = new AuthService(
      { findByEmailWithPassword: jest.fn().mockResolvedValue(admin) } as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.login({ email: 'a@b.com', password: 'wrong-password' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each(['invalid JWT', 'missing JWT'])('rejects %s', (label) => {
    const guard = new JwtAuthGuard();
    expect(() => guard.handleRequest(null, null, { message: label })).toThrow(
      UnauthorizedException,
    );
  });

  it('creates a site and records an audit event', async () => {
    const site = { _id: new Types.ObjectId() };
    const model = {
      exists: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(site),
    };
    const domains = {
      exists: jest.fn().mockResolvedValue(null),
      bulkWrite: jest.fn().mockResolvedValue(undefined),
      updateMany: jest.fn().mockResolvedValue(undefined),
      findOneAndUpdate: jest.fn().mockResolvedValue(undefined),
      find: jest
        .fn()
        .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    };
    const audit = { record: jest.fn() };
    await new SitesService(
      model as never,
      domains as never,
      audit as never,
    ).create(
      {
        name: 'Guwahati',
        slug: 'guwahati',
        domain: 'guwahati.test',
        city: 'Guwahati',
        state: 'Assam',
        country: 'India',
      },
      new Types.ObjectId().toString(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SITE_CREATED' }),
    );
  });

  it('rejects a duplicate site slug or domain', async () => {
    const model = {
      exists: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockRejectedValue({ code: 11000 }),
    };
    const domains = { exists: jest.fn().mockResolvedValue(null) };
    await expect(
      new SitesService(model as never, domains as never, {} as never).create(
        {} as never,
        new Types.ObjectId().toString(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    [PropertyStatus.APPROVED, 'PROPERTY_APPROVED'],
    [PropertyStatus.REJECTED, 'PROPERTY_REJECTED'],
  ])('moves a pending property to %s', async (nextStatus, action) => {
    const property = {
      _id: new Types.ObjectId(),
      siteId: new Types.ObjectId(),
      status: PropertyStatus.PENDING,
      save: jest.fn(),
    };
    const model = { findById: jest.fn().mockResolvedValue(property) };
    const audit = { record: jest.fn() };
    await new PropertiesService(model as never, audit as never).transition(
      property._id.toString(),
      nextStatus,
      new Types.ObjectId().toString(),
      nextStatus === PropertyStatus.REJECTED
        ? 'Incomplete documents'
        : undefined,
    );
    expect(property.status).toBe(nextStatus);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action }),
    );
  });

  it('updates owner status and records an audit event', async () => {
    const owner = { _id: new Types.ObjectId() };
    const model = { findByIdAndUpdate: jest.fn().mockResolvedValue(owner) };
    const audit = { record: jest.fn() };
    await new OwnersService(model as never, audit as never).status(
      owner._id.toString(),
      OwnerStatus.SUSPENDED,
      new Types.ObjectId().toString(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'OWNER_STATUS_CHANGED',
        metadata: { status: OwnerStatus.SUSPENDED },
      }),
    );
  });

  it('persists audit logs through the audit service', async () => {
    const model = { create: jest.fn() };
    await new AuditLogsService(model as never).record({
      action: 'PROPERTY_APPROVED',
    });
    expect(model.create).toHaveBeenCalledWith({ action: 'PROPERTY_APPROVED' });
  });
});
