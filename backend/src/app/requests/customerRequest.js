import Joi from 'joi';

export const createCustomer = Joi.object({
    customerClass: Joi.string()
        .trim()
        .min(1)
        .optional()
        .label('Lớp')
})

export const updateClass = Joi.object({
    newClass: Joi.string()
        .trim()
        .required()
        .label('Lớp')
})

export const updateAmount = Joi.object({
    amount: Joi.number()
        .required()
        .label('Số lượng')
})