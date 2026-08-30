import { BadRequestException } from '@nestjs/common';
import {
  PAGE_PRESETS,
  PAGE_SLUGS,
  SECTION_TYPES,
} from './page-config.constants';
import { PageConfigsService } from './page-configs.service';
describe('PageConfigsService', () => {
  const service = () =>
    new PageConfigsService(
      {} as never,
      {} as never,
      {} as never,
    ) as unknown as {
      normalize: (dto: unknown) => {
        sections: Array<{
          id: string;
          type: string;
          enabled: boolean;
          order: number;
          config: Record<string, unknown>;
        }>;
      };
      defaults: (
        page: string,
        preset?: string,
      ) => {
        sections: Array<{ type: string; enabled: boolean; order: number }>;
      };
      assertPage: (page: string) => void;
      safeConfig: (
        type: string,
        config: Record<string, unknown>,
      ) => Record<string, unknown>;
    };
  const dto = {
    sections: [
      {
        id: 'cta-1',
        type: 'cta',
        enabled: true,
        order: 8,
        config: { title: 'Book now', buttonLink: '/hotels', evil: 'no' },
      },
      {
        id: 'hero-1',
        type: 'hero',
        enabled: false,
        order: 1,
        config: { title: 'Hello' },
      },
    ],
  };
  it('supports the required page registry', () =>
    expect(PAGE_SLUGS).toContain('owner-dashboard'));
  it('supports the controlled section registry', () =>
    expect(SECTION_TYPES).toEqual(
      expect.arrayContaining(['hero', 'search', 'featured-properties', 'cta']),
    ));
  it('creates a safe default homepage', () =>
    expect(service().defaults('home').sections.length).toBeGreaterThan(5));
  it('creates no unsupported sections on non-home defaults', () =>
    expect(service().defaults('about').sections).toHaveLength(0));
  it('supports page presets', () =>
    expect(Object.keys(PAGE_PRESETS)).toEqual(
      expect.arrayContaining([
        'DEFAULT_HOME',
        'MOUNTAIN_HOME',
        'LUXURY_HOME',
        'MINIMAL_HOME',
      ]),
    ));
  it('sorts and normalizes section order', () =>
    expect(
      service()
        .normalize(dto)
        .sections.map((x) => x.type),
    ).toEqual(['hero', 'cta']));
  it('preserves section visibility', () =>
    expect(service().normalize(dto).sections[0].enabled).toBe(false));
  it('removes unapproved section configuration fields', () =>
    expect(service().normalize(dto).sections[1].config).not.toHaveProperty(
      'evil',
    ));
  it('rejects duplicate section ids', () =>
    expect(() =>
      service().normalize({ sections: [dto.sections[0], dto.sections[0]] }),
    ).toThrow(BadRequestException));
  it('rejects unknown section types', () =>
    expect(() =>
      service().normalize({
        sections: [{ ...dto.sections[0], type: 'arbitrary-code' }],
      }),
    ).toThrow(BadRequestException));
  it('rejects invalid page slugs', () =>
    expect(() => service().assertPage('../secret')).toThrow(
      BadRequestException,
    ));
  it('rejects unsafe property limits', () =>
    expect(() =>
      service().safeConfig('featured-properties', { limit: 1000 }),
    ).toThrow(BadRequestException));
  it('does not place property records in page configuration', () =>
    expect(
      service().safeConfig('featured-properties', {
        properties: [{ secret: true }],
        limit: 6,
      }),
    ).toEqual({ limit: 6 }));
  it('keeps presets isolated by returning new section arrays', () =>
    expect(service().defaults('home').sections).not.toBe(
      service().defaults('home').sections,
    ));
});

describe('PageConfigsService site isolation', () => {
  it('uses the resolved site id as the page cache and lookup boundary', async () => {
    const sites = {
      resolveActiveByDomain: jest.fn((host: string) =>
        Promise.resolve({
          _id: host.startsWith('guwahati') ? 'site-g' : 'site-s',
        }),
      ),
    };
    const instance = new PageConfigsService(
      {} as never,
      sites as never,
      {} as never,
    );
    const lookup = jest
      .spyOn(instance, 'getPublishedBySite')
      .mockImplementation((siteId, page) => Promise.resolve({ siteId, page }));

    await instance.getPublishedByHostname('guwahati.localhost', 'home');
    await instance.getPublishedByHostname('shillong.localhost', 'home');

    expect(lookup).toHaveBeenNthCalledWith(1, 'site-g', 'home');
    expect(lookup).toHaveBeenNthCalledWith(2, 'site-s', 'home');
  });
});
