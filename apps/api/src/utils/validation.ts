import Joi from 'joi';

export const userValidation = {
  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('user', 'agent', 'admin').default('user'),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50),
    avatar: Joi.string().uri(),
    status: Joi.string().valid('online', 'away', 'busy', 'offline'),
  }),
};

export const conversationValidation = {
  create: Joi.object({
    participantId: Joi.string().required(),
    subject: Joi.string().max(200),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    tags: Joi.array().items(Joi.string()).max(10),
  }),

  update: Joi.object({
    status: Joi.string().valid('open', 'pending', 'resolved', 'closed'),
    assignedTo: Joi.string(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    tags: Joi.array().items(Joi.string()).max(10),
  }),
};

export const messageValidation = {
  send: Joi.object({
    conversationId: Joi.string().required(),
    content: Joi.string().max(5000).required(),
    type: Joi.string().valid('text', 'file', 'image', 'system').default('text'),
    metadata: Joi.object(),
  }),
};
