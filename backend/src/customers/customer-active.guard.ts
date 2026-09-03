import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { CustomersService } from './customers.service';

@Injectable()
export class CustomerActiveGuard implements CanActivate {
  constructor(private customers: CustomersService) {}
  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { sub?: string } }>();
    if (!request.user?.sub) return false;
    await this.customers.ensureAccess(request.user.sub);
    return true;
  }
}
