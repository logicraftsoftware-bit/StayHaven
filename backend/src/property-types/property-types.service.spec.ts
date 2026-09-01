import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PropertyTypesService } from './property-types.service';
describe('PropertyTypesService', () => {
  it('returns only active public property types without commission fields', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ name: 'Hotel' }]),
    };
    const model = { find: jest.fn(() => query) };
    const result = await new PropertyTypesService(model as never).listActive();
    expect(model.find).toHaveBeenCalledWith({ status: 'active' });
    expect(result[0]).not.toHaveProperty('commissionPercent');
  });
  it('rejects invalid or inactive property type selection', async () => {
    const service = new PropertyTypesService({ findOne: jest.fn() } as never);
    await expect(service.getActive('bad')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    const model = { findOne: jest.fn().mockResolvedValue(null) };
    await expect(
      new PropertyTypesService(model as never).getActive(
        '507f1f77bcf86cd799439011',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
