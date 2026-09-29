import mongoose, { Schema, Document, Types } from 'mongoose';

export type TransactionType = 'earning' | 'withdrawal' | 'incentive';
export type IncentiveStatus = 'pending' | 'received';

export interface ITransaction extends Document {
  platformAccountId: Types.ObjectId;
  userId: Types.ObjectId;
  type: TransactionType;
  amount: number;
  note?: string;
  tag?: string;
  date: Date;
  incentiveStatus?: IncentiveStatus;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    platformAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformAccount',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['earning', 'withdrawal', 'incentive'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    tag: {
      type: String,
      default: '',
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    incentiveStatus: {
      type: String,
      enum: ['pending', 'received'],
      default: function (this: ITransaction) {
        return this.type === 'incentive' ? 'pending' : undefined;
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal tenant-isolated query performance
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, platformAccountId: 1 });

export const TransactionModel =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);
