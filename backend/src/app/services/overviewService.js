import pool from "../../configs/mysql.js";

const TABLE_QUERIES = [
    { key: 'users', sql: 'select * from User order by userId desc' },
    { key: 'customers', sql: 'select * from Customer order by customerId desc' },
    { key: 'suppliers', sql: 'select * from Supplier order by supplierId desc' },
    { key: 'shippers', sql: 'select * from Shipper order by shipperId desc' },
    { key: 'categories', sql: 'select * from Category order by categoryId desc' },
    { key: 'products', sql: 'select * from Product order by productId desc' },
    { key: 'paymentMethods', sql: 'select * from PaymentMethod order by paymentMethodId desc' },
    { key: 'salesOrders', sql: 'select * from SalesOrder order by salesOrderId desc' },
    { key: 'orderDetails', sql: 'select * from OrderDetail order by orderDetailId desc' },
    { key: 'reviews', sql: 'select * from Review order by reviewId desc' },
    { key: 'carts', sql: 'select * from Cart order by cartId desc' },
    { key: 'warehouses', sql: 'select * from Warehouse order by warehouseId desc' },
    { key: 'stores', sql: 'select * from Store order by productId desc' },
    { key: 'chatRooms', sql: 'select * from ChatRoom order by chatRoomId desc' },
    { key: 'messages', sql: 'select * from Message order by messageId desc' },
    { key: 'notifications', sql: 'select * from Notification order by notificationId desc' },
];

export async function getDataOverview() {
    const results = {};

    for (const table of TABLE_QUERIES) {
        const [rows] = await pool.query(table.sql);
        results[table.key] = rows;
    }

    return results;
}
