import Joi from "joi";

export const authSchema = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  adminSignup: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    organizationName: Joi.string().min(2).max(100).required(),
  }),

  initiateSignup: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
  }),

  completeSignup: Joi.object({
    email: Joi.string().email().required(),
    organizationName: Joi.string().min(2).max(100).required(),
    password: Joi.string().min(8).required(),
    domain: Joi.string().trim().max(256).optional().allow("", null),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
    verificationMethod: Joi.string().valid("otp").default("otp"),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
  }),

  resetPasswordWithOTP: Joi.object({
    email: Joi.string().email().required(),
    code: Joi.string().length(6).required(),
    newPassword: Joi.string().min(8).required(),
  }),

  verifyOTP: Joi.object({
    email: Joi.string().email().required(),
    code: Joi.string().length(6).required(),
    type: Joi.string().valid("email_verification", "password_reset").required(),
  }),

  resendOTP: Joi.object({
    email: Joi.string().email().required(),
    type: Joi.string().valid("email_verification", "password_reset").required(),
  }),
};
