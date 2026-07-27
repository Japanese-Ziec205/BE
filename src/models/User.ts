import { Schema, model, type Document, type Types } from 'mongoose';
import { ROLES, type Role } from '../constants/permissions';

export type UserStatus = 'pending_verification' | 'active' | 'suspended' | 'deleted';
export type IdentifierType = 'email' | 'phone';

export interface IIdentifier {
  type: IdentifierType;
  value: string;
  verifiedAt: Date | null;
  isPrimary: boolean;
}

export interface IUser extends Document<Types.ObjectId> {
  identifiers: IIdentifier[];
  passwordHash: string;
  passwordChangedAt: Date;
  tokenVersion: number;
  profile: {
    displayName: string;
    avatarKey: string | null;
    avatarPreset: number;
    bio: string;
    dateOfBirth: Date | null;
    province: string | null;
    timezone: string;
  };
  role: Role;
  permissions: string[];
  status: UserStatus;
  suspension: { reason: string; until: Date | null; byUserId: Types.ObjectId } | null;
  settings: {
    uiMode: 'auto' | 'genki' | 'shizuka';
    theme: 'light' | 'dark' | 'system';
    dataSaver: boolean;
    furiganaMode: 'always' | 'above_level' | 'never';
    fontSize: 'sm' | 'md' | 'lg' | 'xl';
    reminderEnabled: boolean;
    reminderTime: string;
    emailNotifications: boolean;
    romajiCrutch: boolean;
    hideFromLeaderboard: boolean;
  };
  contributionScore: number;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastActiveAt: Date;
  registeredVia: IdentifierType;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const identifierSchema = new Schema<IIdentifier>(
  {
    type: { type: String, enum: ['email', 'phone'], required: true },
    value: { type: String, required: true, trim: true },
    verifiedAt: { type: Date, default: null },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    identifiers: {
      type: [identifierSchema],
      required: true,
      validate: {
        validator: (v: IIdentifier[]) => v.length > 0,
        message: 'Tài khoản cần ít nhất một email hoặc số điện thoại',
      },
    },
    passwordHash: { type: String, required: true, select: false },
    passwordChangedAt: { type: Date, default: Date.now },
    tokenVersion: { type: Number, default: 0 },

    profile: {
      displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
      avatarKey: { type: String, default: null },
      // 12 avatar mascot có sẵn — người dùng mạng yếu không cần tải ảnh lên
      avatarPreset: { type: Number, default: 0, min: 0, max: 11 },
      bio: { type: String, default: '', maxlength: 300 },
      dateOfBirth: { type: Date, default: null },
      province: { type: String, default: null },
      timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
    },

    role: { type: String, enum: ROLES, default: 'student', index: true },
    permissions: { type: [String], default: [] },

    status: {
      type: String,
      enum: ['pending_verification', 'active', 'suspended', 'deleted'],
      default: 'pending_verification',
      index: true,
    },
    suspension: {
      type: new Schema(
        {
          reason: String,
          until: { type: Date, default: null },
          byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        },
        { _id: false },
      ),
      default: null,
    },

    settings: {
      uiMode: { type: String, enum: ['auto', 'genki', 'shizuka'], default: 'auto' },
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      dataSaver: { type: Boolean, default: false },
      furiganaMode: {
        type: String,
        enum: ['always', 'above_level', 'never'],
        default: 'above_level',
      },
      fontSize: { type: String, enum: ['sm', 'md', 'lg', 'xl'], default: 'md' },
      reminderEnabled: { type: Boolean, default: true },
      reminderTime: { type: String, default: '20:00' },
      emailNotifications: { type: Boolean, default: true },
      romajiCrutch: { type: Boolean, default: true },
      hideFromLeaderboard: { type: Boolean, default: false },
    },

    contributionScore: { type: Number, default: 0 },

    // Khoá mềm chống dò mật khẩu
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },

    lastActiveAt: { type: Date, default: Date.now },
    registeredVia: { type: String, enum: ['email', 'phone'], required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/**
 * Một email/SĐT chỉ thuộc về một tài khoản đang hoạt động (BR-01).
 * partialFilterExpression cho phép dùng lại định danh sau khi tài khoản cũ bị xoá mềm.
 */
userSchema.index(
  { 'identifiers.value': 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
userSchema.index({ role: 1, status: 1 });
userSchema.index({ lastActiveAt: -1 });

userSchema.methods.toJSON = function toJSON(this: IUser) {
  const obj = this.toObject();
  delete (obj as Record<string, unknown>).passwordHash;
  delete (obj as Record<string, unknown>).__v;
  return obj;
};

export const User = model<IUser>('User', userSchema);
