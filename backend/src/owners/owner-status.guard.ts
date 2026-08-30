import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { OwnersService } from './owners.service';

@Injectable()
export class OwnerStatusGuard implements CanActivate {
  constructor(private owners: OwnersService) {}

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { sub?: string } }>();
    if (!request.user?.sub) throw new UnauthorizedException();
    await this.owners.ensureAccess(request.user.sub);
    return true;
  }
}
