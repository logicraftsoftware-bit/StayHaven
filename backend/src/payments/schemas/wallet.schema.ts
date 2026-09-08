import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ collection: 'gw_owner_wallets', timestamps: true })
export class OwnerWallet {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  ownerId: Types.ObjectId;
  @Prop({ default: 0, min: 0 }) availableBalance: number;
  @Prop({ default: 0, min: 0 }) pendingBalance: number;
  @Prop({ default: 0, min: 0 }) totalSettled: number;
  @Prop({ default: 0, min: 0 }) totalWithdrawn: number;
  @Prop({ default: '' }) beneficiaryName: string;
  @Prop({ default: '', select: false }) bankAccountNumber: string;
  @Prop({ default: '', select: false }) bankIfsc: string;
  @Prop({ default: '' }) razorpayContactId: string;
  @Prop({ default: '' }) razorpayFundAccountId: string;
  @Prop({ type: [String], default: [], select: false })
  appliedSettlementReferences: string[];
}
export const OwnerWalletSchema = SchemaFactory.createForClass(OwnerWallet);

@Schema({ collection: 'gw_wallet_transactions', timestamps: true })
export class WalletTransaction {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, index: true }) propertyId?: Types.ObjectId;
  @Prop({ type: Types.ObjectId, index: true }) bookingId?: Types.ObjectId;
  @Prop({ type: Types.ObjectId, index: true }) withdrawalId?: Types.ObjectId;
  @Prop({ required: true, enum: ['SETTLEMENT', 'WITHDRAWAL', 'ADJUSTMENT'] })
  type: string;
  @Prop({ required: true, enum: ['CREDIT', 'DEBIT'] }) direction: string;
  @Prop({ required: true, min: 1 }) amount: number;
  @Prop({ required: true, unique: true }) reference: string;
  @Prop({ required: true }) description: string;
  @Prop({ required: true, enum: ['PENDING', 'COMPLETED', 'FAILED'] })
  status: string;
  @Prop({ default: false }) appliedToBalance: boolean;
  createdAt: Date;
}
export const WalletTransactionSchema =
  SchemaFactory.createForClass(WalletTransaction);

@Schema({ collection: 'gw_withdrawals', timestamps: true })
export class Withdrawal {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerId: Types.ObjectId;
  @Prop({ required: true, unique: true }) withdrawalNumber: string;
  @Prop({ required: true, min: 100000 }) amount: number;
  @Prop({ required: true, default: 'QUEUED', index: true }) status: string;
  @Prop({ required: true }) beneficiaryName: string;
  @Prop({ required: true }) accountMask: string;
  @Prop({ required: true }) ifsc: string;
  @Prop() razorpayPayoutId?: string;
  @Prop() utr?: string;
  @Prop() failureReason?: string;
  @Prop() processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
export const WithdrawalSchema = SchemaFactory.createForClass(Withdrawal);
