import Joi from "joi";

export const knowledgeSchema = {
  // POST /knowledge/request-upload — file (PDF/DOCX)
  requestUpload: Joi.object({
    title: Joi.string().trim().min(1).required(),
    description: Joi.string().trim().allow("").optional(),
    catalog: Joi.string().trim().allow("").optional(),
    source: Joi.string().valid("pdf", "docx").required(),
    fileName: Joi.string().trim().required(),
    mimeType: Joi.string()
      .valid(
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      )
      .required(),
    fileSize: Joi.number().integer().positive().optional(),
    teamId: Joi.string().trim().optional(),
  }),

  // POST /knowledge — text (static) or url (realtime sync)
  createText: Joi.object({
    title: Joi.string().trim().min(1).required(),
    description: Joi.string().trim().allow("").optional(),
    catalog: Joi.string().trim().allow("").optional(),
    source: Joi.string().valid("text", "url").required(),
    content: Joi.string().when("source", {
      is: "text",
      then: Joi.string().trim().min(1).required(),
      otherwise: Joi.string().allow("").optional(),
    }),
    url: Joi.string().uri().when("source", {
      is: "url",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    // URL-only crawl options
    fetchMode: Joi.string().valid("single", "crawl").when("source", {
      is: "url",
      then: Joi.optional().default("single"),
      otherwise: Joi.forbidden(),
    }),
    crawlDepth: Joi.number().integer().min(1).max(5).when("fetchMode", {
      is: "crawl",
      then: Joi.optional().default(1),
      otherwise: Joi.optional(),
    }),
    syncFrequency: Joi.string()
      .valid("manual", "1hour", "6hours", "daily")
      .when("source", {
        is: "url",
        then: Joi.optional().default("manual"),
        otherwise: Joi.forbidden(),
      }),
    teamId: Joi.string().trim().optional(),
  }),
};
