import Joi from "joi";

const slugPattern = /^[a-z0-9-]+$/;

export const organizationSchema = {
  createOrganization: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    slug: Joi.string().pattern(slugPattern).min(2).max(50),
  }),

  updateOrganization: Joi.object({
    name: Joi.string().min(2).max(100),
    slug: Joi.string().pattern(slugPattern).min(2).max(50),
    logoUrl: Joi.string().uri().allow(""),
    whiteLabelEnabled: Joi.boolean(),
  }).min(1),

  orgParams: Joi.object({
    orgId: Joi.string().required(),
  }),

  switchOrganizationParams: Joi.object({
    orgId: Joi.string().required(),
  }),

  billingPortalQuery: Joi.object({
    targetPlan: Joi.string().valid("pro", "proplus"),
  }),

  updateWhiteLabel: Joi.object({
    removeBranding: Joi.boolean().required(),
  }),
};
