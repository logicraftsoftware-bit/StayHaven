import { ForbiddenException } from '@nestjs/common';
import { OwnerOperationsService } from './owner-operations.service';
describe('OwnerOperationsService', () => {
  it('rejects team assignments to another owner property', async () => {
    const properties = {
      find: jest.fn().mockReturnValue({
        select: jest
          .fn()
          .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      }),
    };
    const service = new OwnerOperationsService(
      {} as never,
      {} as never,
      properties as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.saveTeam('507f1f77bcf86cd799439011', {
        name: 'Member',
        email: 'member@example.com',
        permissions: [],
        assignedPropertyIds: ['507f1f77bcf86cd799439012'],
        temporaryPassword: 'password1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('accepts an owner property and normalizes duplicate selections', async () => {
    const propertyId = '507f1f77bcf86cd799439012';
    const properties = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ _id: propertyId }]),
        }),
      }),
    };
    const teams = {
      create: jest.fn().mockImplementation((data: Record<string, unknown>) => ({
        ...data,
        _id: '507f1f77bcf86cd799439013',
      })),
    };
    const audit = { record: jest.fn() };
    const service = new OwnerOperationsService(
      teams as never,
      {} as never,
      properties as never,
      audit as never,
      {} as never,
    );
    await service.saveTeam('507f1f77bcf86cd799439011', {
      name: 'Member',
      email: 'member@example.com',
      permissions: [],
      assignedPropertyIds: [propertyId, propertyId],
      temporaryPassword: 'password1',
    });
    expect(teams.create).toHaveBeenCalledWith(
      expect.objectContaining({
        assignedPropertyIds: [expect.objectContaining({})],
      }),
    );
  });
  it('requires VIEW_PROPERTIES for team property access', () => {
    const service = new OwnerOperationsService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    expect(() =>
      service.listAssigned({
        ownerId: '507f1f77bcf86cd799439011',
        propertyIds: [],
        permissions: [],
      }),
    ).toThrow(ForbiddenException);
  });
});
