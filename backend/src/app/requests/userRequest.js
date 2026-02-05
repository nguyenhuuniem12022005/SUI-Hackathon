import Joi from 'joi';

export const createUser = Joi.object({
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
        .label('Mật khẩu')
})

export const resetPassword = Joi.object({
    currentPassword: Joi.string()
        .min(6)
        .max(255)
        .required()
        .label('Mật khẩu hiện tại'),
    newPassword: Joi.string()
        .min(6)
        .max(255)
        .required()
        .label('Mật khẩu mới')
})

export const updateUserName = Joi.object({
    userName: Joi.string()
        .trim()
        .token()
        .min(6)
        .max(255)
        .required()
        .label('UserName')
})

export const updatePhone = Joi.object({
    phone: Joi.string()
        .trim()
        .max(15)
        .required()
        .label('Số điện thoại')
})

export const updateAddress = Joi.object({
    address: Joi.string()
        .trim()
        .max(255)
        .required()
        .label('Địa chỉ')
})

export const updateAmount = Joi.object({
    amount: Joi.number()
        .required()
        .label('Số lượng')
})

export const updateReputationScore = Joi.object({
    amount: Joi.number()
        .integer()
        .required()
        .label('Điểm uy tín')
})

export const updateGreenCredit = Joi.object({
    amount: Joi.number()
        .integer()
        .required()
        .label('Green Credit')
})

export const updateDateOfBirth = Joi.object({
    dateOfBirth: Joi.date()
        .iso() // Bắt buộc định dạng 'YYYY-MM-DD'
        .required()
        .label('Ngày sinh')
});

export const connectWallet = Joi.object({
    walletAddress: Joi.string()
        .trim()
        .min(10)
        .max(255)
        .required()
        .label('Địa chỉ ví'),
    privateKey: Joi.string()
        .trim()
        .min(32)
        .max(512)
        .required()
        .label('Private key')
});
export const convertGreenCredit = Joi.object({
    amount: Joi.number()
        .integer()
        .positive()
        .required()
        .label('Green Credit mu?n quy �?i')
});
