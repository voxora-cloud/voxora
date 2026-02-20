import Joi from "joi";

export const conversationSchema = {
  updateStatus: Joi.object({
    status: Joi.string()
      .valid("open", "pending", "resolved", "closed")
      .required(),
  }),

  updateVisitor: Joi.object({
    name: Joi.string().min(1).max(100),
    email: Joi.string().email(),
    sessionId: Joi.string().required(),
  })
    .or("name", "email")
    .options({ stripUnknown: true }),

  route: Joi.object({
    teamId: Joi.string(),
    agentId: Joi.string(),
    reason: Joi.string().max(500).allow(""),
  }).or("teamId", "agentId"),

  filters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    status: Joi.string().valid("open", "pending", "resolved", "closed"),
  }),
};
