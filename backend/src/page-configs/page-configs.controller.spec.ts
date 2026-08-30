import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PageConfigsController } from './page-configs.controller';
import { PublicPageConfigsController } from './public-page-configs.controller';

describe('Page configuration authorization', () => {
  it('limits all page mutations and drafts to Super Admin', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PageConfigsController)).toEqual([
      Role.SUPER_ADMIN,
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, PageConfigsController)).toEqual(
      expect.arrayContaining([JwtAuthGuard, RolesGuard]),
    );
  });

  it('keeps the published configuration endpoint public', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, PublicPageConfigsController),
    ).toBeUndefined();
  });
});
