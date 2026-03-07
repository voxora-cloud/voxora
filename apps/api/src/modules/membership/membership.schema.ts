import Joi from "joi";

export const membershipSchema = {
    inviteMember: Joi.object({
        name: Joi.string().min(2).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).optional(),
        role: Joi.string().valid("agent", "admin", "owner").required(),
        teamIds: Joi.array()
            .when("role", {
                is: "agent",
                then: Joi.array().items(Joi.string().required()).min(1).required().messages({
                    "array.min": "Agents must be assigned to at least one team.",
                }),
                otherwise: Joi.array().items(Joi.string()).optional(),
            }),
    }),
};
