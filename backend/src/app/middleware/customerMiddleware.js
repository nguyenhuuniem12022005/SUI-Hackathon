import pool from "../../configs/mysql.js";
import ApiError from "../../utils/classes/api-error.js";

async function ensureCustomer(req, res, next) {
    if(!req.user || !req.user.userId){
        return next(ApiError.unauthorized('Yêu cầu xác thực người dùng!'));
    }
    try {
        const customerId = req.user.userId;
    
        const [rows] = await pool.query(`
            select customerId
            from Customer
            where customerId = ?    
            `, [customerId]);

        // Chưa tồn tại người dùng, cho phép tạo. Nếu tồn tại rồi thì bỏ qua
        if (rows.length === 0) {
            console.log(`Tạo người dùng với customerId = ${customerId}`);
            const customerClass = 'D23CQCE04-B';

            await pool.query(`
                insert into Customer(customerId, class, totalPurchasedOrders)
                values (?, ?, default)
                `, [customerId, customerClass]);
        }

        next();
    } catch (error) {
        next(error);
    }
}

export default ensureCustomer;