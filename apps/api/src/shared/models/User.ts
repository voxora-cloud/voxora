import mongoose, { Document, Schema, Types } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: "admin" | "agent";
  avatar?: string;
  status: "online" | "away" | "busy" | "offline";
  lastSeen: Date;
  isActive: boolean;
  teams: string[];
  permissions: string[];
  companyName?: string;
  phoneNumber?: string;
  inviteStatus: "pending" | "active" | "inactive";
  invitedBy?: string;
  invitedAt?: Date;
  inviteExpiresAt?: Date;
  activatedAt?: Date;
  emailVerified: boolean;
  emailVerificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  totalChats: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["admin", "agent"], default: "agent" },
    avatar: { type: String, default: null },
    status: { type: String, enum: ["online", "away", "busy", "offline"], default: "offline" },
    lastSeen: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    teams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    permissions: [{ type: String }],
    companyName: { type: String, trim: true, maxlength: 100 },
    phoneNumber: { type: String, trim: true },
    inviteStatus: { type: String, enum: ["pending", "active", "inactive"], default: "pending" },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    invitedAt: { type: Date },
    inviteExpiresAt: { type: Date },
    activatedAt: { type: Date },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    totalChats: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

export const User = mongoose.model<IUser>("User", userSchema);
