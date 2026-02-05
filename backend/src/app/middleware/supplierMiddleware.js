import pool from "../../configs/mysql.js";
import ApiError from "../../utils/classes/api-error.js";

async function ensureSupplier(req, res, next){
    if(!req.user || !req.user.userId){
        return next(ApiError.unauthorized('Yêu cầu xác thực người dùng!'));
    }
    try {
        const supplierId = req.user.userId;

        const [rows] = await pool.query(`
            select supplierId 
            from Supplier 
            where supplierId = ?    
            `, [supplierId]);

        if(rows.length === 0){
            console.log('Tạo người bán với supplierId =', supplierId);
            const shopName = "shop_" + supplierId + "_" + Math.random().toString(36).substring(2, 6);

            await pool.query(`
                insert into Supplier(supplierId, shopName, sellerRating)
                values (?, ?, default)
                `, [supplierId, shopName]);
        }
        next();
    } catch (error) {
        next(error);
    }
} 

export default ensureSupplier;