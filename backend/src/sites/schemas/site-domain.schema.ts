import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum DomainVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

export enum DomainSslStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  FAILED = 'failed',
}

@Schema({ collection: 'gw_site_domains', timestamps: true })
export class SiteDomain {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  siteId: Types.ObjectId;
  @Prop({ required: true, trim: true }) domain: string;
  @Prop({ required: true, lowercase: true, trim: true, unique: true })
  normalizedDomain: string;
  @Prop({ default: false }) isPrimary: boolean;
  @Prop({ default: false }) verified: boolean;
  @Prop({ default: 'dns' }) verificationMethod: string;
  @Prop({
    type: String,
    enum: DomainVerificationStatus,
    default: DomainVerificationStatus.PENDING,
  })
  verificationStatus: DomainVerificationStatus;
  @Prop({
    type: String,
    enum: DomainSslStatus,
    default: DomainSslStatus.PENDING,
  })
  sslStatus: DomainSslStatus;
  @Prop({ default: true, index: true }) active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SiteDomainDocument = HydratedDocument<SiteDomain>;
export const SiteDomainSchema = SchemaFactory.createForClass(SiteDomain);
SiteDomainSchema.index({ normalizedDomain: 1 }, { unique: true });
SiteDomainSchema.index({ siteId: 1, active: 1 });
