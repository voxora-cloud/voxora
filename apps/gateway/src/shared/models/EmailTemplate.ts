import mongoose, { Document, Schema } from "mongoose";

export type EmailTemplateType =
  | "invite"
  | "welcome"
  | "email_verification_otp"
  | "password_reset_otp"
  | "notification"
  | "alert"
  | "agent_verification_otp"
  | "conversation_summary"
  | "ticket_created"
  | "ticket_updated"
  | "ticket_resolved"
  | "ticket_closed"
  | "free_credit_granted"
  | "usage_threshold_warning"
  | "usage_exhausted"
  | "subscription_activated"
  | "channel_verified"
  | "domain_verification_pending"
  | "domain_verification_completed";

export interface IEmailTemplate extends Document {
  templateKey: string;
  type: EmailTemplateType;
  subjectTemplate: string;
  htmlTemplate: string;
  textTemplate?: string;
  isActive: boolean;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    templateKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      enum: [
         "invite",
         "welcome",
         "email_verification_otp",
         "password_reset_otp",
         "notification",
         "alert",
         "agent_verification_otp",
         "conversation_summary",
         "ticket_created",
         "ticket_updated",
         "ticket_resolved",
         "ticket_closed",
         "free_credit_granted",
         "usage_threshold_warning",
         "usage_exhausted",
         "subscription_activated",
         "channel_verified",
         "domain_verification_pending",
         "domain_verification_completed",
      ],
      required: true,
      unique: true,
      index: true,
    },
    subjectTemplate: { type: String, required: true },
    htmlTemplate: { type: String, required: true },
    textTemplate: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const EmailTemplate = mongoose.model<IEmailTemplate>(
  "EmailTemplate",
  EmailTemplateSchema,
);
