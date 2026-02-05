import pool from "../../configs/mysql.js";
import validator from 'validator';
import ApiError from "../../utils/classes/api-error.js";

async function checkProductAndWarehouseExist(req, res, next) {
    const { productId, warehouseId } = req.body;

    const productIdStr = productId !== undefined ? String(productId) : '';
    const warehouseIdStr = warehouseId !== undefined ? String(warehouseId) : '';

    if(!productIdStr || !validator.isInt(productIdStr, {min:1})){
        return next(ApiError.badRequest('ID của Product không hợp lệ!'));
    }

    if(!warehouseIdStr || !validator.isInt(warehouseIdStr, {min: 1})){
        return next(ApiError.badRequest('ID của Warehouse không hợp lệ'));
    }

    const numericProductId = Number(productIdStr);
    const numericWarehouseId = Number(warehouseIdStr);

    const [rowsP] = await pool.query(`
        select * 
        from Product
        where productId = ?    
        `, [numericProductId]);
    
    if(rowsP.length === 0){
        return next(ApiError.notFound('Không tìm thấy ID trong Product'));
    }

    const [rowsW] = await pool.query(`
        select * 
        from Warehouse
        where warehouseId = ?`
        , [numericWarehouseId]);
    
    if(rowsW.length === 0){
        return next(ApiError.notFound('Không tìm thấy ID trong Warehouse'));
    }

    req.body.productId = numericProductId;
    req.body.warehouseId = numericWarehouseId;

    return next();
}

export default checkProductAndWarehouseExist;
