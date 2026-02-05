import pool from "../../configs/mysql.js";
import ApiError from "../../utils/classes/api-error.js";
import validator from 'validator';
import checkProductIdExists from "./productMiddleware.js";

async function checkWarehouseIdExists(req, res, next) {
    const { id } = req.params;

    if (!id || !validator.isInt(id, { min: 1 })) {
        return next(ApiError.badRequest('ID kho hàng không hợp lệ.'));
    }

    try {
        const [rows] = await pool.query(
            'select * from Warehouse where warehouseId = ?'
            , [id]);

        if (rows.length > 0) {
            // req.warehouse = rows[0]; // Tùy chọn: Gắn kho vào req
            return next();
        } else {
            return next(ApiError.notFound('Không tìm thấy kho hàng.'));
        }
    } catch (error) {
        return next(error);
    }
}

export default checkProductIdExists;