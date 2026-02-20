import Joi from "joi";

export const widgetSchema = {
  createConversation: Joi.object({
    voxoraPublicKey: Joi.string().required(),
    message: Joi.string().max(1000).required(),
    visitorName: Joi.string().min(1).max(100).optional(),
    visitorEmail: Joi.string().email().optional(),
    sessionId: Joi.string().optional(),
    teamId: Joi.string().optional(),
    department: Joi.string().max(100).optional(),
  }).options({ stripUnknown: true }),

  updateVisitor: Joi.object({
    name: Joi.string().min(1).max(100),
    email: Joi.string().email(),
    sessionId: Joi.string().required(),
  })
    .or("name", "email")
    .options({ stripUnknown: true }),
};
