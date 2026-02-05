// backend/src/app/middleware/common/validate.js (ĐÃ SỬA HOÀN CHỈNH)

import ApiError from "../../../utils/classes/api-error.js";
import Joi from 'joi'; // 1. Chỉ import đối tượng chính Joi (Default Import)

// 2. Trích xuất ValidationError từ đối tượng Joi (Đúng cách cho CommonJS)
const { ValidationError } = Joi; 

function validate(schema){
    if(!Joi.isSchema(schema)){
        throw new Error('"schema" must be a Joi schema.');
    }

    return async function(req, res, next){
        try {
            const validatedValue = await schema.validateAsync(req.body, {
                abortEarly: false,
                stripUnknown: true // loai bo truong du lieu khong xac dinh
            });

            req.body = validatedValue;
            return next();
        } catch (error) {
            // ✅ SỬ DỤNG ValidationError ĐÃ TRÍCH XUẤT
            if(error instanceof ValidationError){
                const errorMessage = error.details.map(details => details.message).join(', ');
                return next(ApiError.badRequest(errorMessage));
            }
            
            return next(error);
        }
    }
}

export default validate;