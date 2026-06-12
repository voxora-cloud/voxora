import Joi from "joi";

export const emailSchema = {
  sendEmail: Joi.object({
    organizationId: Joi.string().required(),
    conversationId: Joi.string().allow("", null),
    to: Joi.string().email().required(),
    template: Joi.string().valid("agent_verification_otp", "conversation_summary").required(),
    variables: Joi.object().required(),
    replyTo: Joi.string().email().allow("", null),
  }),

  verifyAgentOtp: Joi.object({
    organizationId: Joi.string().required(),
    conversationId: Joi.string().required(),
    email: Joi.string().email(),
    code: Joi.string().pattern(/^\d{6}$/).required(),
  }),
};
