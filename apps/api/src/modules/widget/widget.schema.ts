import Joi from "joi";

const appearanceSchema = Joi.object({
  theme: Joi.string().valid("dark", "light").required(),
  welcomeMessage: Joi.string().min(1).max(500).required(),
}).options({ stripUnknown: true });

const behaviorSchema = Joi.object({
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

const suggestionSchema = Joi.object({
  text: Joi.string().trim().min(1).max(160).required(),
  showOutside: Joi.boolean().default(false),
  enabled: Joi.boolean().default(true),
  source: Joi.string().valid("manual", "faq").default("manual"),
  knowledgeId: Joi.string().trim().allow("").optional(),
  _id: Joi.string().optional(),
}).options({ stripUnknown: true });

const suggestionsSchema = Joi.array().items(suggestionSchema).max(3);

export const widgetSchema = {
  createWidget: Joi.object({
    displayName: Joi.string().min(1).max(50).required(),
    appearance: appearanceSchema,
    behavior: behaviorSchema,
    ai: aiSchema,
    conversation: conversationSchema,
    features: featuresSchema,
    suggestions: suggestionsSchema,
  }).options({ stripUnknown: true }),

  updateWidget: Joi.object({
    displayName: Joi.string().min(1).max(50),
    appearance: appearanceSchema,
    behavior: behaviorSchema,
    ai: aiSchema,
    conversation: conversationSchema,
    features: featuresSchema,
    suggestions: suggestionsSchema,
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
