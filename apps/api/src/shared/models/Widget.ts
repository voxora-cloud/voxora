import mongoose, { Document, Schema, Types } from "mongoose";
import { IOrganization } from "./Organization";

export interface IWidget extends Document {
  organizationId: Types.ObjectId | IOrganization;
  displayName: string;
  logoUrl?: string;
  backgroundColor: string;
  appearance: {
    primaryColor: string;
    textColor?: string;
    position: "bottom-right" | "bottom-left";
    launcherText: string;
    welcomeMessage: string;
    logoUrl?: string;
  };
  behavior: {
    autoOpen: boolean;
    showOnMobile: boolean;
    showOnDesktop: boolean;
  };
  ai: {
    enabled: boolean;
    model: string;
    fallbackToAgent: boolean;
    autoAssign: boolean;
    assignmentStrategy: "round-robin" | "least-loaded";
  };
  conversation: {
    collectUserInfo: {
      name: boolean;
      email: boolean;
      phone?: boolean;
    };
  };
  features: {
    acceptMediaFiles: boolean;
    endUserDomAccess: boolean;
  };
  publicKey?: string;
}

const WidgetSchema = new Schema<IWidget>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, unique: true },
    displayName: { type: String, required: true },
    logoUrl: { type: String, required: false, default: "" },
    backgroundColor: { type: String, required: true },
    appearance: {
      primaryColor: { type: String, default: "#10b981" },
      textColor: { type: String, default: "#111827" },
      position: {
        type: String,
        enum: ["bottom-right", "bottom-left"],
        default: "bottom-right",
      },
      launcherText: { type: String, default: "Chat with us" },
      welcomeMessage: {
        type: String,
        default: "Hi there! How can we help you today?",
      },
      logoUrl: { type: String, default: "" },
    },
    behavior: {
      autoOpen: { type: Boolean, default: false },
      showOnMobile: { type: Boolean, default: true },
      showOnDesktop: { type: Boolean, default: true },
    },
    ai: {
      enabled: { type: Boolean, default: true },
      model: { type: String, default: "gpt-4o-mini" },
      fallbackToAgent: { type: Boolean, default: true },
      autoAssign: { type: Boolean, default: true },
      assignmentStrategy: {
        type: String,
        enum: ["round-robin", "least-loaded"],
        default: "least-loaded",
      },
    },
    conversation: {
      collectUserInfo: {
        name: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        phone: { type: Boolean, default: false },
      },
    },
    features: {
      acceptMediaFiles: { type: Boolean, default: true },
      endUserDomAccess: { type: Boolean, default: false },
    },
    publicKey: { type: String, default: null },
  },
  { timestamps: true },
);

export const Widget = mongoose.model<IWidget>("Widget", WidgetSchema);
