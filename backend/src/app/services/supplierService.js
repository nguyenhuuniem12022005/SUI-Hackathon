import pool from "../../configs/mysql.js";

export async function updateShopName(supplierId, newShopName){
    await pool.query(`
        update Supplier 
        set shopName = ?
        where supplierId = ?    
        `, [newShopName, supplierId]);
}

export async function updateSellerRating(supplierId) {
    await pool.query(`
        update Supplier s
        set s.sellerRating = (
            select COALESCE(AVG(r.starNumber), 0)
            from Review r
            join OrderDetail od on r.orderDetailId = od.orderDetailId
            join Product p ON od.productId = p.productId
            where p.supplierId = ?
        )
        where s.supplierId = ?;
    `, [supplierId, supplierId]);
}