import mongoose, { Document, Schema, Types } from "mongoose";
import { IOrganization } from "./Organization";
import { DEFAULT_WIDGET_CONFIG } from "@shared/core/widget-default-config";

export interface IWidget extends Document {
  organizationId: Types.ObjectId | IOrganization;
  displayName: string;
  logoUrl?: string;
  appearance: {
    theme: "dark" | "light";
    // primaryColor removed, using theme only
    welcomeMessage: string;
    logoUrl?: string;
  };
  // backgroundColor removed, using theme only
  behavior: {
    showWidget: boolean;
    showOnlyOnSelectedPages: boolean;
    allowedPageRules: string[];
    autoOpen: boolean;
    showOnMobile: boolean;
    showOnDesktop: boolean;
  };
  ai: {
    enabled: boolean;
    model: string;
    fallbackToAgent: boolean;
  };
  conversation: {
    collectUserInfo: {
      name: boolean;
      email: boolean;
      phone?: boolean;
    };
  };
  features: {
    endUserDomAccess: boolean;
  };
  suggestions: Array<{
    text: string;
    showOutside: boolean;
  }>;
  publicKey?: string;
}

const WidgetSchema = new Schema<IWidget>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, unique: true },
    displayName: { type: String, required: true },
    logoUrl: { type: String, required: false, default: "" },
    appearance: {
      theme: { type: String, enum: ["dark", "light"], default: "dark" },
      // primaryColor removed, using theme only
      welcomeMessage: {
        type: String,
        default: DEFAULT_WIDGET_CONFIG.appearance.welcomeMessage,
      },
      logoUrl: { type: String, default: "" },
    },
    // backgroundColor removed, using theme only
    behavior: {
      showWidget: { type: Boolean, default: true },
      showOnlyOnSelectedPages: { type: Boolean, default: false },
      allowedPageRules: { type: [String], default: [] },
      autoOpen: { type: Boolean, default: false },
      showOnMobile: { type: Boolean, default: true },
      showOnDesktop: { type: Boolean, default: true },
    },
    ai: {
      enabled: { type: Boolean, default: true },
      model: { type: String, default: "gpt-4o-mini" },
      fallbackToAgent: { type: Boolean, default: true },
    },
    conversation: {
      collectUserInfo: {
        name: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        phone: { type: Boolean, default: false },
      },
    },
    features: {
      endUserDomAccess: { type: Boolean, default: false },
    },
    suggestions: {
      type: [
        {
          text: { type: String, required: true },
          showOutside: { type: Boolean, default: false },
        },
      ],
      default: DEFAULT_WIDGET_CONFIG.suggestions,
    },
    publicKey: { type: String, default: null },
  },
  { timestamps: true },
);

export const Widget = mongoose.model<IWidget>("Widget", WidgetSchema);
