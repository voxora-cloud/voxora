import Joi from "joi";

export const agentSchema = {
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50),
    avatar: Joi.string().uri(),
    status: Joi.string().valid("online", "away", "busy", "offline"),
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid("online", "away", "busy", "offline").required(),
  }),
};
