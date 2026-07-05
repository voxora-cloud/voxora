export type ChannelType = "email" | "whatsapp" | "telegram";
export type ChannelVerificationStatus = "pending" | "verified" | "failed";

export interface DnsRecord {
  type: "MX" | "TXT" | "CNAME";
  name: string;
  value: string;
  priority?: number;
  ttl?: number | string;
}

export interface EmailChannelConfig {
  address: string;
  addresses: string[];
  domain: string;
  providerDomainId?: string;
  verificationStatus: ChannelVerificationStatus;
  dnsRecords: DnsRecord[];
  verifiedAt?: string;
}

export interface WhatsAppChannelConfig {
  phoneNumber: string;
  accountSid: string;
  authToken: string;
  messagingServiceSid?: string;
  verificationStatus: ChannelVerificationStatus;
}

export interface TelegramChannelConfig {
  botToken: string;
  botUsername?: string;
  verificationStatus: ChannelVerificationStatus;
}



export interface Channel {
  _id: string;
  organizationId: string;
  type: ChannelType;
  name: string;
  isActive: boolean;
  config: {
    email?: EmailChannelConfig;
    whatsapp?: WhatsAppChannelConfig;
    telegram?: TelegramChannelConfig;
  };
  createdAt: string;
  updatedAt: string;
}

// API response wrappers
export interface ChannelListResponse {
  success: boolean;
  data: {
    channels: Channel[];
  };
}

export interface ChannelResponse {
  success: boolean;
  data: {
    channel: Channel;
  };
}

export interface VerifyChannelResponse {
  success: boolean;
  message: string;
  data: {
    status: ChannelVerificationStatus;
    dnsRecords: DnsRecord[];
  };
}
