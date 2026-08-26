import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Owner, OwnerSchema } from './schemas/owner.schema';
import { OwnersController } from './owners.controller';
import { OwnersService } from './owners.service';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Owner.name, schema: OwnerSchema }]),
    AuditLogsModule,
  ],
  controllers: [OwnersController],
  providers: [OwnersService],
  exports: [OwnersService],
})
export class OwnersModule {}
