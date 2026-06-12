import Joi from "joi";

export const contactsSchema = {
  listContactsQuery: Joi.object({
    q: Joi.string().trim().max(200).allow(""),
    limit: Joi.number().integer().min(1).max(300),
  }),

  upsertFromAI: Joi.object({
    organizationId: Joi.string().required(),
    conversationId: Joi.string().required(),
    name: Joi.string().trim().max(120),
    email: Joi.string().email(),
    phone: Joi.string().trim().max(40),
    company: Joi.string().trim().max(120),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(20),
    note: Joi.string().trim().max(2000),
    status: Joi.string().valid("active", "inactive", "blocked"),
    sentiment: Joi.string().valid("positive", "neutral", "negative"),
    summary: Joi.string().trim().max(4000),
    topics: Joi.array().items(Joi.string().trim().max(80)).max(20),
    timelineLabel: Joi.string().trim().max(200),
    timelineDetail: Joi.string().trim().max(2000),
  }),
};
