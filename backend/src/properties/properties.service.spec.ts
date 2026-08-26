import { BadRequestException } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertyStatus } from '../common/enums/status.enum';
describe('PropertiesService', () => {
  it('rejects invalid property IDs', async () => {
    const service = new PropertiesService({} as never, {} as never);
    await expect(service.get('invalid')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
  it('uses bounded pagination defaults', async () => {
    const query = {
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    };
    const model = {
      find: jest.fn(() => query),
      countDocuments: jest.fn().mockResolvedValue(0),
    };
    const service = new PropertiesService(model as never, {} as never);
    const result = await service.list({
      page: 1,
      limit: 20,
      status: PropertyStatus.PENDING,
    });
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
    expect(query.limit).toHaveBeenCalledWith(20);
  });
});
