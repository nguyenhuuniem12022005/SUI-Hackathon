import pool from "../../configs/mysql.js";
import ApiError from "../../utils/classes/api-error.js";
import validator from 'validator';

async function checkProductIdExists(req, res, next) {
    const { id } = req.params;

    if (!id || !validator.isInt(id, { min: 1 })) {
        return next(ApiError.badRequest('ID sản phẩm không hợp lệ!'));
    }

    try {
        const [rows] = await pool.query(`
            select * 
            from Product 
            where productId = ?
            `, [id]);

        if (rows.length > 0) {
            // req.product = rows[0]; // Tùy chọn: Gắn sản phẩm vào req
            return next(); // Tìm thấy sản phẩm, đi tiếp.
        }
        next(ApiError.notFound('Không tìm thấy sản phẩm!'));
    } catch (error) {
        return next(error);
    }
}

export default checkProductIdExists;