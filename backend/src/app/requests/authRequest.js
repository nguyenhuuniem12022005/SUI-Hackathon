import Joi from 'joi';

export const login = Joi.object({
    email: Joi.string()
        .trim()
        .lowercase()
        .email()
        .max(255)
        .required()
        .label('Email'),
    password: Joi.string()
        .min(6)
        .max(255)
        .required()
        .label('Mật khẩu')
})

export const register = Joi.object({
    firstName: Joi.string()
        .trim()
        .min(1)
        .max(255)
        .required()
        .label('First Name'),
    lastName: Joi.string()
        .trim()
        .min(1)
        .max(255)
        .required()
        .label('Last Name'),
    userName: Joi.string()
        .trim()
        .token()
        .min(6)
        .max(255)
        .required()
        .label('UserName'),
    email: Joi.string()
        .trim()
        .min(6)
        .max(255)
        .email()
        .required()
        .label('Email'),
    password: Joi.string()
        .min(6)
        .max(255)
        .required()
        .label('Mật khẩu'),
    referralCode: Joi.string()
        .trim()
        .max(20)
        .allow('', null)
        .label('Referral Code')
})

export const resetPassword = Joi.object({
    password: Joi.string()
        .min(6)
        .max(255)
        .required()
        .label('Mật khẩu mới')
})

export const requestPasswordReset = Joi.object({
    email: Joi.string().trim().lowercase().email().max(255).required().label('Email')
})

export const confirmPasswordReset = Joi.object({
    token: Joi.string().trim().required().label('Mã xác nhận'),
    password: Joi.string().min(6).max(255).required().label('Mật khẩu mới')
})
