import pool from "../../configs/mysql.js";

export async function createStore({ productId, warehouseId, quantity }) {
    const sql = `
        INSERT INTO Store (productId, warehouseId, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + ?
    `;
    
    await pool.query(sql, [productId, warehouseId, quantity, quantity]);

    const [rows] = await pool.query(
        `
            SELECT s.*, w.warehouseName
            FROM Store s
            JOIN Warehouse w ON s.warehouseId = w.warehouseId
            WHERE s.productId = ? AND s.warehouseId = ?
        `,
        [productId, warehouseId]
    );

    return rows[0] || null;
}

export async function updateQuantity(productId, warehouseId, quantity) {
    const sql = `
        UPDATE Store
        SET quantity = ?
        WHERE productId = ? AND warehouseId = ?
    `;
    
    await pool.query(sql, [quantity, productId, warehouseId]);
}

export async function getStoreByProduct(productId) {
    const [rows] = await pool.query(`
        SELECT s.*, w.warehouseName
        FROM Store s
        JOIN Warehouse w ON s.warehouseId = w.warehouseId
        WHERE s.productId = ?
    `, [productId]);
    
    return rows;
}
