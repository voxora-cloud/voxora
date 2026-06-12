import Joi from "joi";

export const storageSchema = {
  publicUrlParams: Joi.object({
    objectKey: Joi.string().trim().required(),
  }),

  proxyFileQuery: Joi.object({
    key: Joi.string().trim().required(),
  }),

  presignedUpload: Joi.object({
    fileName: Joi.string().trim().required(),
    mimeType: Joi.string().trim().required(),
    expiresIn: Joi.number().integer().min(60).max(86400).optional(),
  }),

  presignedDownload: Joi.object({
    fileKey: Joi.string().trim().required(),
    expiresIn: Joi.number().integer().min(60).max(86400).optional(),
  }),

  listFilesQuery: Joi.object({
    prefix: Joi.string().trim().allow("").optional(),
  }),

  fileKeyParams: Joi.object({
    fileKey: Joi.string().trim().required(),
  }),
};
