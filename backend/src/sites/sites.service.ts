import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../common/enums/role.enum';
import { CreateSiteDto, SiteStatusDto, UpdateSiteDto } from './dto/site.dto';
import { Site } from './schemas/site.schema';
@Injectable()
export class SitesService {
  constructor(
    @InjectModel(Site.name) private model: Model<Site>,
    private audit: AuditLogsService,
  ) {}
  async create(dto: CreateSiteDto, actor: string) {
    try {
      const site = await this.model.create(dto);
      await this.audit.record({
        actorId: new Types.ObjectId(actor),
        actorRole: Role.SUPER_ADMIN,
        action: 'SITE_CREATED',
        entityType: 'SITE',
        entityId: site._id,
      });
      return site;
    } catch (e) {
      if ((e as { code?: number }).code === 11000)
        throw new ConflictException('Site slug or domain already exists');
      throw e;
    }
  }
  list() {
    return this.model.find().sort({ createdAt: -1 });
  }
  async get(id: string) {
    const site = await this.model.findById(id);
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }
  async update(id: string, dto: UpdateSiteDto, actor: string) {
    const site = await this.model.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });
    if (!site) throw new NotFoundException('Site not found');
    await this.audit.record({
      actorId: new Types.ObjectId(actor),
      actorRole: Role.SUPER_ADMIN,
      action: 'SITE_UPDATED',
      entityType: 'SITE',
      entityId: site._id,
    });
    return site;
  }
  async status(id: string, dto: SiteStatusDto, actor: string) {
    const site = await this.model.findByIdAndUpdate(
      id,
      { status: dto.status },
      { new: true },
    );
    if (!site) throw new NotFoundException('Site not found');
    await this.audit.record({
      actorId: new Types.ObjectId(actor),
      actorRole: Role.SUPER_ADMIN,
      action: 'SITE_STATUS_CHANGED',
      entityType: 'SITE',
      entityId: site._id,
      metadata: { status: dto.status },
    });
    return site;
  }
  count() {
    return this.model.countDocuments();
  }
}
