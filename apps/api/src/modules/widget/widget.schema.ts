import Joi from "joi";

const pageRuleSchema = Joi.string()
  .trim()
  .min(1)
  .max(2048)
  .custom((value, helpers) => {
    if (/\s/.test(value)) {
      return helpers.error("any.invalid");
    }

    try {
      if (/^https?:\/\//i.test(value)) {
        const url = new URL(value);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return helpers.error("any.invalid");
        }
        return value;
      }

      if (value.startsWith("/") && !value.startsWith("//")) {
        new URL(value, "https://example.com");
        return value;
      }
    } catch {
      return helpers.error("any.invalid");
    }

    return helpers.error("any.invalid");
  }, "page URL or path validation")
  .messages({
    "any.invalid": "Hidden pages must be http(s) URLs or paths starting with /",
  });

const appearanceSchema = Joi.object({
  theme: Joi.string().valid("dark", "light").required(),
  welcomeMessage: Joi.string().min(1).max(500).required(),
}).options({ stripUnknown: true });

const behaviorSchema = Joi.object({
  showWidget: Joi.boolean().default(true),
  showOnlyOnSelectedPages: Joi.boolean().default(false),
  allowedPageRules: Joi.array().items(pageRuleSchema).max(50).default([]),
  autoOpen: Joi.boolean().required(),
  showOnMobile: Joi.boolean().required(),
  showOnDesktop: Joi.boolean().required(),
});

const aiSchema = Joi.object({
  enabled: Joi.boolean().required(),
  model: Joi.string().min(1).max(120).required(),
  fallbackToAgent: Joi.boolean().required(),
});

const conversationSchema = Joi.object({
  collectUserInfo: Joi.object({
    name: Joi.boolean().required(),
    email: Joi.boolean().required(),
    phone: Joi.boolean(),
  }).required(),
});

const featuresSchema = Joi.object({
  endUserDomAccess: Joi.boolean().required(),
});

export const widgetSchema = {
  createWidget: Joi.object({
    displayName: Joi.string().min(1).max(50).required(),
    appearance: appearanceSchema,
    behavior: behaviorSchema,
    ai: aiSchema,
    conversation: conversationSchema,
    features: featuresSchema,
  }).options({ stripUnknown: true }),

  updateWidget: Joi.object({
    displayName: Joi.string().min(1).max(50),
    appearance: appearanceSchema,
    behavior: behaviorSchema,
    ai: aiSchema,
    conversation: conversationSchema,
    features: featuresSchema,
    _id: Joi.string().optional(),
    userId: Joi.string().optional(),
    createdAt: Joi.date().optional(),
    updatedAt: Joi.date().optional(),
    __v: Joi.number().optional(),
  }).options({ stripUnknown: true }),

  createConversation: Joi.object({
    InteraOnePublicKey: Joi.string().required(),
    message: Joi.string().required(),
    visitorName: Joi.string().min(1).max(100).optional(),
    visitorEmail: Joi.string().email().optional(),
    sessionId: Joi.string().optional(),
    department: Joi.string().max(100).optional(),
  }).options({ stripUnknown: true }),

  updateVisitor: Joi.object({
    name: Joi.string().min(1).max(100),
    email: Joi.string().email(),
    sessionId: Joi.string().required(),
  })
    .or("name", "email")
    .options({ stripUnknown: true }),

  qrScan: Joi.object({
    publicKey: Joi.string().required(),
  }).options({ stripUnknown: true }),
};
