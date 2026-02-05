import Joi from 'joi';

export const createProduct = Joi.object({
    productName: Joi.string()
        .trim()
        .min(2)
        .max(255)
        .required()
        .label('Tên sản phẩm'),

    description: Joi.string()
        .trim()
        .max(2000)
        .allow(null, '')
        .label('Mô tả'),

    unitPrice: Joi.number()
        .positive()
        .required()
        .label('Giá sản phẩm'),

    categoryId: Joi.number()
        .integer()
        .positive()
        .required()
        .label('Danh mục'),

    size: Joi.string()
        .trim()
        .max(50)
        .allow(null, '')
        .label('Kích thước'),

    status: Joi.string()
        .valid('Draft', 'Pending', 'Active', 'Sold')
        .default('Draft')
        .label('Trạng thái'),
    
    discount: Joi.number()
        .min(0)
        .max(100)
        .default(0)
        .label('Giảm giá')
});


export const updateProduct = Joi.object({
    productName: Joi.string()
        .trim()
        .min(2)
        .max(255)
        .label('Tên sản phẩm'),

    description: Joi.string()
        .trim()
        .max(2000)
        .allow(null, '')
        .label('Mô tả'),

    unitPrice: Joi.number()
        .positive()
        .label('Giá sản phẩm'),

    categoryId: Joi.number()
        .integer()
        .positive()
        .label('Danh mục'),

    size: Joi.string()
        .trim()
        .max(50)
        .allow(null, '')
        .label('Kích thước'),

    status: Joi.string()
        .valid('Draft', 'Pending', 'Active', 'Sold')
        .label('Trạng thái'),

    discount: Joi.number()
        .min(0)
        .max(100)
        .label('Giảm giá')
}).min(1); // Phải có ít nhất 1 trường để update


export const updateProductStatus = Joi.object({
    status: Joi.string()
        .valid('Draft', 'Pending', 'Active', 'Sold')
        .required()
        .label('Trạng thái')
});


export const searchProducts = Joi.object({
    searchTerm: Joi.string()
        .trim()
        .allow('', null)
        .label('Từ khóa tìm kiếm'),
    categoryId: Joi.number()
        .integer()
        .positive()
        .allow(null)
        .label('Danh mục')
});

export const requestProductAudit = Joi.object({
    note: Joi.string().trim().max(500).allow('', null).label('Ghi chú'),
    attachments: Joi.array().items(Joi.string().uri().trim()).max(5).default([]).label('Tài liệu'),
});

export const reviewProductAudit = Joi.object({
    status: Joi.string().valid('APPROVED', 'REJECTED').required().label('Trạng thái kiểm duyệt'),
    note: Joi.string().trim().max(500).allow('', null).label('Ghi chú'),
});

export const createProductReview = Joi.object({
    orderDetailId: Joi.number().integer().positive().required().label('Sản phẩm trong đơn'),
    rating: Joi.number().integer().min(1).max(5).required().label('Đánh giá'),
    comment: Joi.string().trim().max(1000).allow('', null).label('Nhận xét'),
    attachments: Joi.array().items(Joi.string().uri().trim()).max(5).default([]).label('Đính kèm'),
});

export const flagReview = Joi.object({
    reason: Joi.string().trim().max(1000).allow('', null).label('Lý do báo cáo'),
});
