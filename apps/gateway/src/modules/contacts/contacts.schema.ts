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
    sentiment: Joi.string().valid("positive", "neutral", "negative"),
    summary: Joi.string().trim().max(4000),
    topics: Joi.array().items(Joi.string().trim().max(80)).max(20),
  }),

  deleteContacts: Joi.object({
    ids: Joi.array().items(Joi.string().required()).min(1).required(),
  }),

  bulkAddTags: Joi.object({
    ids: Joi.array().items(Joi.string().required()).min(1).required(),
    tags: Joi.array().items(Joi.string().trim().max(50).required()).min(1).required(),
  }),

  addNote: Joi.object({
    content: Joi.string().trim().max(2000).required(),
  }),

  addTag: Joi.object({
    tag: Joi.string().trim().max(50).required(),
  }),

  resolveConflict: Joi.object({
    action: Joi.string().valid("apply", "dismiss").required(),
  }),

  updateContact: Joi.object({
    name: Joi.string().trim().max(120),
    email: Joi.string().email().allow(""),
    phone: Joi.string().trim().max(40).allow(""),
    company: Joi.string().trim().max(120).allow(""),
  })
    .or("name", "email", "phone", "company")
    .options({ stripUnknown: true }),
};
