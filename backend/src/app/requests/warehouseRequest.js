import Joi from 'joi';

export const createWarehouse = Joi.object({
    warehouseName: Joi.string()
        .trim()
        .min(3)
        .max(255)
        .required()
        .label('Tên kho'),
    
    capacity: Joi.number()
        .integer()
        .positive()
        .optional()
        .allow(null)
        .label('Sức chứa')
});


export const updateWarehouse = Joi.object({
    warehouseName: Joi.string()
        .trim()
        .min(3)
        .max(255)
        .optional()
        .label('Tên kho'),

    capacity: Joi.number()
        .integer()
        .positive()
        .optional()
        .allow(null)
        .label('Sức chứa')
}).min(1); // Phải có ít nhất 1 trường để cập nhật