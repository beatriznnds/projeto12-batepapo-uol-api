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
    type: Joi.string()
        .valid(('message', 'private_message')),
    from: Joi.string()
        .required()
})

export { userSchema, messageSchema }