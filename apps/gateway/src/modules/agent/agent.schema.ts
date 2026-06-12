import Joi from "joi";

export const agentSchema = {
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50),
    status: Joi.string().valid("online", "away", "busy", "offline"),
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid("online", "away", "busy", "offline").required(),
  }),
};
