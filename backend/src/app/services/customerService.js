import pool from "../../configs/mysql.js";

export async function updateClass(customerId, newClass) {
    await pool.query(`
        update Customer 
        set class = ?
        where customerId = ?    
        `, [newClass, customerId]);
}

export async function updateTotalPurchasedOrders(customerId, amount) {
    await pool.query(`
        update Customer
        set totalPurchasedOrders = greatest(0, totalPurchasedOrders + ?)
        where customerId = ?
        `, [amount, customerId]);
}