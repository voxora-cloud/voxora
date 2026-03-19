import Joi from "joi";

const appearanceSchema = Joi.object({
  primaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
  textColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(""),
  position: Joi.string().valid("bottom-right", "bottom-left").required(),
  launcherText: Joi.string().min(1).max(80).required(),
  welcomeMessage: Joi.string().min(1).max(500).required(),
  logoUrl: Joi.string().allow(""),
});

const behaviorSchema = Joi.object({
  autoOpen: Joi.boolean().required(),
  showOnMobile: Joi.boolean().required(),
  showOnDesktop: Joi.boolean().required(),
});

const aiSchema = Joi.object({
  enabled: Joi.boolean().required(),
  model: Joi.string().min(1).max(120).required(),
  fallbackToAgent: Joi.boolean().required(),
  autoAssign: Joi.boolean().required(),
  assignmentStrategy: Joi.string().valid("round-robin", "least-loaded").required(),
});

const conversationSchema = Joi.object({
  collectUserInfo: Joi.object({
    name: Joi.boolean().required(),
    email: Joi.boolean().required(),
    phone: Joi.boolean(),
  }).required(),
});

const featuresSchema = Joi.object({
  acceptMediaFiles: Joi.boolean().required(),
  endUserDomAccess: Joi.boolean().required(),
});

export const adminSchema = {
  createTeam: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    description: Joi.string().max(500).allow(""),
    color: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .default("#3b82f6"),
  }),

  updateTeam: Joi.object({
    name: Joi.string().min(2).max(50),
    description: Joi.string().max(500).allow(""),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
    isActive: Joi.boolean(),
  }),

  inviteAgent: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid("agent", "admin").required(),
    teamIds: Joi.array().items(Joi.string().required()).min(1).required(),
  }),

  updateAgent: Joi.object({
    name: Joi.string().min(2).max(50),
    email: Joi.string().email(),
    role: Joi.string().valid("agent", "admin"),
    teamIds: Joi.array().items(Joi.string().required()),
    isActive: Joi.boolean(),
    status: Joi.string().valid("online", "offline", "busy", "away"),
  }),

  createWidget: Joi.object({
    displayName: Joi.string().min(1).max(50).required(),
    logoUrl: Joi.string().allow(""),
    backgroundColor: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .default("#ffffff"),
    appearance: appearanceSchema,
    behavior: behaviorSchema,
    ai: aiSchema,
    conversation: conversationSchema,
    features: featuresSchema,
  }),

  updateWidget: Joi.object({
    displayName: Joi.string().min(1).max(50),
    logoUrl: Joi.string().allow(""),
    backgroundColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
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

  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    search: Joi.string().max(100).allow(""),
  }),

  agentFiltersQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    role: Joi.string().valid("agent", "admin"),
    status: Joi.string().valid("online", "offline", "busy", "away"),
    search: Joi.string().max(100).allow(""),
  }),
};
