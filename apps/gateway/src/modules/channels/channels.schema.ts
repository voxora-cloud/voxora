import Joi from "joi";

const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const channelsSchema = {
  createEmailChannel: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().pattern(emailPattern).required().messages({
      "string.pattern.base": "Must be a valid email address",
    }),
    domain: Joi.string().pattern(domainPattern).required().messages({
      "string.pattern.base": "Must be a valid domain name (e.g. acme.com)",
    }),
  }),

  updateEmailChannelAddresses: Joi.object({
    emails: Joi.array().items(Joi.string().pattern(emailPattern)).min(1).required().messages({
      "array.min": "At least one email address is required",
      "string.pattern.base": "Must be a valid email address",
    }),
  }),

  createWhatsAppChannel: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    phoneNumber: Joi.string().required().messages({
      "string.empty": "WhatsApp phone number is required",
    }),
    accountSid: Joi.string().required().messages({
      "string.empty": "Twilio Account SID is required",
    }),
    authToken: Joi.string().required().messages({
      "string.empty": "Twilio Auth Token is required",
    }),
    messagingServiceSid: Joi.string().allow("").optional(),
  }),

  createTelegramChannel: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    botToken: Joi.string().required().messages({
      "string.empty": "Telegram Bot Token is required",
    }),
  }),

  channelParams: Joi.object({
    channelId: Joi.string().required(),
  }),
};
