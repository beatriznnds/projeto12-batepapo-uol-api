import Joi from "joi";

const userSchema = Joi.object({
    name: Joi.string()
        .required()
});

export {userSchema};