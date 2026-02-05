import Joi from 'joi';

export const updateShopName = Joi.object({
    shopName: Joi.string()
        .trim()
        .min(3) 
        .max(100)
        .required()
        .label('Tên cửa hàng')
});