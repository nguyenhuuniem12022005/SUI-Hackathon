import Joi from 'joi';

export const createStore = Joi.object({
    productId: Joi.number()
        .integer()
        .positive()
        .required()
        .label('ID sản phẩm'),
    warehouseId: Joi.number()
        .integer()
        .positive()
        .required()
        .label('ID kho hàng'),
    quantity: Joi.number()
        .integer()  
        .min(0)
        .required()
        .label('Số lượng')
});

export const setQuantity = Joi.object({
    productId: Joi.number()
        .integer()
        .positive()
        .required()
        .label('ID sản phẩm'),
    warehouseId: Joi.number()
        .integer()
        .positive()
        .required()
        .label('ID kho hàng'),
    quantity: Joi.number()
        .integer()
        .min(0)
        .required()
        .label('Số lượng')
});

export const updateQuantity = Joi.object({
    productId: Joi.number()
        .integer()
        .positive()
        .required()
        .label('ID sản phẩm'),
    warehouseId: Joi.number()
        .integer()
        .positive()
        .required()
        .label('ID kho hàng'),
    amount: Joi.number()
        .integer()
        .required() // có thể âm hoặc dương
        .label('Số lượng')
});

export const deleteStore = Joi.object({
    productId: Joi.number()
        .integer()
        .positive()
        .required()
        .label('ID sản phẩm'),
    warehouseId: Joi.number()
        .integer()
        .positive()
        .required()
        .label('ID kho hàng')
})