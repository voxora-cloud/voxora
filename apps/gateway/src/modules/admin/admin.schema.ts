import Joi from "joi";

export const adminSchema = {


  inviteAgent: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid("agent", "admin").required(),
  }),

  updateAgent: Joi.object({
    name: Joi.string().min(2).max(50),
    email: Joi.string().email(),
    role: Joi.string().valid("agent", "admin"),
    isActive: Joi.boolean(),
    status: Joi.string().valid("online", "offline", "busy", "away"),
  }),

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
