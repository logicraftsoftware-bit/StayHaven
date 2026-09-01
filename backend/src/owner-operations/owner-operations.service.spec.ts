import { ForbiddenException } from '@nestjs/common';
import { OwnerOperationsService } from './owner-operations.service';
describe('OwnerOperationsService', () => {
  it('rejects team assignments to another owner property', async () => {
    const properties = { countDocuments: jest.fn().mockResolvedValue(0) };
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
