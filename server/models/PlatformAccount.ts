import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPlatformAccount extends Document {
  userId: Types.ObjectId;
  platformName: string;
  colorTheme: string;
  icon: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformAccountSchema = new Schema<IPlatformAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platformName: {
      type: String,
      required: true,
      trim: true,
    },
    colorTheme: {
      type: String,
      default: '#002970',
    },
    icon: {
      type: String,
      default: 'Z',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for optimal tenant-isolated platform queries
PlatformAccountSchema.index({ userId: 1, order: 1 });

export const PlatformAccountModel =
  mongoose.models.PlatformAccount ||
  mongoose.model<IPlatformAccount>('PlatformAccount', PlatformAccountSchema);
