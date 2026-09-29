import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  phone: string;
  passwordHash: string;
  language: 'en' | 'hi';
  dailyTarget?: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en',
    },
    dailyTarget: {
      type: Number,
      default: 1500,
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
