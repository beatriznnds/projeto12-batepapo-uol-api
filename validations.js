import Joi from "joi";

const userSchema = Joi.object({
    name: Joi.string()
        .required()
});

const messageSchema = Joi.object ({
    to: Joi.string()
        .required(),
    text: Joi.string()
        .required(),
    from: Joi.string()
        .required(),
    type: Joi.string()
        .required()
})

export { userSchema, messageSchema }