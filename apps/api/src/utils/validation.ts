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

  updateStatus: Joi.object({
    status: Joi.string().valid('online', 'away', 'busy', 'offline').required(),
  }),

  acceptInvite: Joi.object({
    token: Joi.string().required(),
  }),

  // Admin signup validation
  adminSignup: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    companyName: Joi.string().min(2).max(100).required(),
  }),

  // Agent invitation validation
  inviteAgent: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('agent', 'admin').required(),
    teamIds: Joi.array().items(Joi.string().required()).min(1).required(),
  }),

  // Update agent validation
  updateAgent: Joi.object({
    name: Joi.string().min(2).max(50),
    email: Joi.string().email(),
    role: Joi.string().valid('agent', 'admin'),
    teamIds: Joi.array().items(Joi.string().required()),
    isActive: Joi.boolean(),
    status: Joi.string().valid('online', 'offline', 'busy', 'away'),
  }),

  // Password validations
  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),

  resetPassword: Joi.object({
    newPassword: Joi.string().min(8).required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
  }),
};

export const teamValidation = {
  create: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    description: Joi.string().max(500).allow(''),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#3b82f6'),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(50),
    description: Joi.string().max(500).allow(''),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
    isActive: Joi.boolean(),
  }),
};

export const conversationValidation = {
  create: Joi.object({
    // voxoraPublicKey: Joi.string().required(),
    participantId: Joi.string().required(),
    subject: Joi.string().max(200),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    tags: Joi.array().items(Joi.string()).max(10),
  }),

  // Widget conversation creation (public, no auth required)
  createWidget: Joi.object({
    voxoraPublicKey: Joi.string().required(),
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    message: Joi.string().max(1000).required(),
    phone: Joi.string().max(20).optional(),
    subject: Joi.string().max(200).optional(),
  }),

  update: Joi.object({
    status: Joi.string().valid('open', 'pending', 'resolved', 'closed'),
    assignedTo: Joi.string(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    tags: Joi.array().items(Joi.string()).max(10),
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('open', 'pending', 'resolved', 'closed').required(),
  }),

  transfer: Joi.object({
    agentEmail: Joi.string().email().required(),
    note: Joi.string().max(500).allow(''),
  }),

  addNote: Joi.object({
    content: Joi.string().min(1).max(1000).required(),
    isInternal: Joi.boolean().default(true),
  }),
};

export const messageValidation = {
  send: Joi.object({
    conversationId: Joi.string().required(),
    content: Joi.string().max(5000).required(),
    type: Joi.string().valid('text', 'file', 'image', 'system').default('text'),
    metadata: Joi.object(),
  }),

  // Widget message (public, no auth required)
  sendWidget: Joi.object({
    content: Joi.string().min(1).max(5000).required(),
    sender: Joi.string().max(50).optional(),
    email: Joi.string().email().optional(),
  }),
};

export const widgetValidation = {
  create: Joi.object({
    displayName: Joi.string().min(1).max(50).required(),
    logoUrl: Joi.string().uri().allow(''),
    backgroundColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  }),
  update: Joi.object({
    displayName: Joi.string().min(1).max(50),
    logoUrl: Joi.string().uri().allow(''),
    backgroundColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
    // Allow these fields but ignore them in update
    _id: Joi.string().optional(),
    userId: Joi.string().optional(),
    createdAt: Joi.date().optional(),
    updatedAt: Joi.date().optional(),
    __v: Joi.number().optional(),
  }).options({ stripUnknown: true }), // This will remove any unknown fields
};

export const queryValidation = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    search: Joi.string().max(100).allow(''),
  }),

  agentFilters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    role: Joi.string().valid('agent', 'admin'),
    status: Joi.string().valid('online', 'offline', 'busy', 'away'),
    search: Joi.string().max(100).allow(''),
  }),

  conversationFilters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    status: Joi.string().valid('open', 'pending', 'resolved', 'closed'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    search: Joi.string().max(100).allow(''),
  }),
};
