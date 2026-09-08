/* eslint-disable @typescript-eslint/no-unsafe-return */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertyStatus } from '../common/enums/status.enum';
import { Types } from 'mongoose';
describe('PropertiesService', () => {
  it('rejects invalid property IDs', async () => {
    const service = new PropertiesService(
      {} as never,
      {} as never,
      {} as never,
    );
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
    const service = new PropertiesService(
      model as never,
      {} as never,
      {} as never,
    );
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

  it('always scopes owner property access by authenticated owner id', async () => {
    let captured: { _id: Types.ObjectId; ownerId: Types.ObjectId } | undefined;
    const model = {
      findOne: jest.fn(
        (query: { _id: Types.ObjectId; ownerId: Types.ObjectId }) => {
          captured = query;
          return Promise.resolve(null);
        },
      ),
    };
    const service = new PropertiesService(
      model as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.getOwner('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(captured?._id.toHexString()).toBe('507f1f77bcf86cd799439012');
    expect(captured?.ownerId.toHexString()).toBe('507f1f77bcf86cd799439011');
  });

  it('validates the selected active site before property creation', async () => {
    const sites = {
      getActive: jest.fn().mockRejectedValue(new NotFoundException()),
    };
    const model = { create: jest.fn() };
    const service = new PropertiesService(
      model as never,
      {} as never,
      sites as never,
    );
    await expect(
      service.createOwner(
        '507f1f77bcf86cd799439011',
        {
          siteId: '507f1f77bcf86cd799439013',
          name: 'Archived site property',
          propertyType: 'Hotel',
          address: 'Address',
          city: 'City',
          state: 'State',
        },
        '507f1f77bcf86cd799439014',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(model.create).not.toHaveBeenCalled();
  });

  it('scopes public listings to approved active properties for the resolved site', async () => {
    let filter: Record<string, unknown> = {};
    let projection = '';
    const query = {
      select: jest.fn((value: string) => {
        projection = value;
        return query;
      }),
      sort: jest.fn(() => query),
      skip: jest.fn(() => query),
      limit: jest.fn(() => query),
      lean: jest.fn().mockResolvedValue([]),
    };
    const model = {
      find: jest.fn((value: Record<string, unknown>) => {
        filter = value;
        return query;
      }),
      countDocuments: jest.fn().mockResolvedValue(0),
    };
    const service = new PropertiesService(
      model as never,
      {} as never,
      {} as never,
    );
    await service.listPublic('507f1f77bcf86cd799439013', {
      page: 1,
      limit: 12,
    });
    expect(String(filter.siteId)).toBe('507f1f77bcf86cd799439013');
    expect(filter.status).toBe(PropertyStatus.APPROVED);
    expect(filter.active).toEqual({ $ne: false });
    expect(projection).not.toContain('financeLegal');
    expect(projection).not.toContain('documents');
    expect(projection).not.toContain('reviewHistory');
  });

  it('rejects an invalid public availability date range', async () => {
    const service = new PropertiesService(
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.publicAvailability('507f1f77bcf86cd799439013', 'stay', {
        checkIn: '2026-10-10',
        checkOut: '2026-10-09',
        guests: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists owner inventory updates for rooms belonging to the property', async () => {
    const inventory = { bulkWrite: jest.fn().mockResolvedValue({}) };
    const audit = { record: jest.fn().mockResolvedValue({}) };
    const service = new PropertiesService(
      {} as never,
      audit as never,
      {} as never,
      {} as never,
      undefined,
      inventory as never,
    );
    jest.spyOn(service, 'getOwner').mockResolvedValue({
      _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
      siteId: new Types.ObjectId('507f1f77bcf86cd799439013'),
      roomDetails: [{ id: 'room-one', name: 'Deluxe' }],
    } as never);
    const result = await service.updateOwnerInventory(
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
      {
        entries: [
          {
            roomId: 'room-one',
            date: '2026-09-10',
            available: 4,
            blocked: 1,
            rate: 2500,
            extraAdultRate: 700,
            extraChildRate: 350,
            minimumStay: 2,
            maximumStay: 5,
          },
        ],
      },
    );
    expect(result).toEqual({ updated: 1 });
    expect(inventory.bulkWrite).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ROOM_INVENTORY_UPDATED' }),
    );
  });

  it('rejects inventory updates for a room outside the owner property', async () => {
    const service = new PropertiesService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      undefined,
      { bulkWrite: jest.fn() } as never,
    );
    jest.spyOn(service, 'getOwner').mockResolvedValue({
      _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
      roomDetails: [{ id: 'room-one' }],
    } as never);
    await expect(
      service.updateOwnerInventory(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        {
          entries: [
            {
              roomId: 'foreign-room',
              date: '2026-09-10',
              available: 1,
              blocked: 0,
              rate: 1000,
              extraAdultRate: 0,
              extraChildRate: 0,
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
