export interface CreateEmailChannelInput {
  name: string;
  /** Full email address: support@acme.com */
  email: string;
  /** Domain only: acme.com */
  domain: string;
}

export interface CreateWhatsAppChannelInput {
  name: string;
  phoneNumber: string;
  accountSid: string;
  authToken: string;
  messagingServiceSid?: string;
}

export interface CreateTelegramChannelInput {
  name: string;
  botToken: string;
}

export interface CreateInstagramChannelInput {
  name: string;
  pageAccessToken: string;
  instagramAccountId: string;
  instagramUsername: string;
  pageId: string;
}
