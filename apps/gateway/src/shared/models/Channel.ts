import mongoose, { Document, Schema, Types } from "mongoose";

export type ChannelType = "email" | "whatsapp" | "telegram";
export type ChannelVerificationStatus = "pending" | "verified" | "failed";

export interface IDnsRecord {
  type: "MX" | "TXT" | "CNAME";
  name: string;
  value: string;
  priority?: number;
  ttl?: number | string;
}

export interface IEmailChannelConfig {
  /** The full email address e.g. support@acme.com */
  address?: string;
  /** The list of all configured email addresses under this domain */
  addresses: string[];
  /** The domain portion e.g. acme.com */
  domain: string;
  /**
   * The provider's domain/identity ID.
   * For AWS SES this is the domain name itself (e.g. "acme.com").
   */
  providerDomainId?: string;
  /** Current DNS verification state */
  verificationStatus: ChannelVerificationStatus;
  /** DNS records the user must configure (DKIM CNAMEs for SES) */
  dnsRecords: IDnsRecord[];
  /** When the domain was last successfully verified */
  verifiedAt?: Date;
}

export interface IWhatsAppChannelConfig {
  /** The clean international phone number, e.g. "+14155238886" */
  phoneNumber: string;
  /** Twilio Account SID */
  accountSid: string;
  /** Twilio Auth Token */
  authToken: string;
  /** Optional Twilio Messaging Service SID */
  messagingServiceSid?: string;
  /** Verification status */
  verificationStatus: ChannelVerificationStatus;
}

export interface ITelegramChannelConfig {
  /** Telegram Bot API Token */
  botToken: string;
  /** Telegram Bot Username (retrieved automatically via getMe) */
  botUsername?: string;
  /** Verification status */
  verificationStatus: ChannelVerificationStatus;
}



export interface IChannelConfig {
  email?: IEmailChannelConfig;
  whatsapp?: IWhatsAppChannelConfig;
  telegram?: ITelegramChannelConfig;
}

export interface IChannel extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  type: ChannelType;
  name: string;
  isActive: boolean;
  config: IChannelConfig;
  createdAt: Date;
  updatedAt: Date;
}

const dnsRecordSchema = new Schema<IDnsRecord>(
  {
    type: { type: String, enum: ["MX", "TXT", "CNAME"], required: true },
    name: { type: String, required: true },
    value: { type: String, required: true },
    priority: { type: Number },
    ttl: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const emailChannelConfigSchema = new Schema<IEmailChannelConfig>(
  {
    address: { type: String, trim: true, lowercase: true },
    addresses: { type: [String], default: [] },
    domain: { type: String, required: true, trim: true, lowercase: true },
    providerDomainId: { type: String },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
    },
    dnsRecords: { type: [dnsRecordSchema], default: [] },
    verifiedAt: { type: Date, default: null },
  },
  { _id: false },
);

const channelSchema = new Schema<IChannel>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    type: {
      type: String,
      enum: ["email", "whatsapp", "telegram"],
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    isActive: { type: Boolean, default: true },
    config: {
      email: { type: emailChannelConfigSchema, default: undefined },
      whatsapp: {
        type: new Schema(
          {
            phoneNumber: { type: String, required: true, trim: true },
            accountSid: { type: String, required: true, trim: true },
            authToken: { type: String, required: true, trim: true },
            messagingServiceSid: { type: String, trim: true },
            verificationStatus: {
              type: String,
              enum: ["pending", "verified", "failed"],
              default: "verified",
            },
          },
          { _id: false },
        ),
        default: undefined,
      },
      telegram: {
        type: new Schema(
          {
            botToken: { type: String, required: true, trim: true },
            botUsername: { type: String, trim: true },
            verificationStatus: {
              type: String,
              enum: ["pending", "verified", "failed"],
              default: "verified",
            },
          },
          { _id: false },
        ),
        default: undefined,
      },
    },
  },
  { timestamps: true },
);

// One email channel per organization (sparse allows multiple orgs without email channel)
channelSchema.index(
  { organizationId: 1, type: 1 },
  { unique: true, sparse: false, name: "unique_channel_type_per_org" },
);
channelSchema.index({ organizationId: 1, isActive: 1 });

export const Channel = mongoose.model<IChannel>("Channel", channelSchema);
