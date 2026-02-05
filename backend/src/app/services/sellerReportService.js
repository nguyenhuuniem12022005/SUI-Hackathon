import pool from '../../configs/mysql.js';

const COMPLETED_STATUS = 'Completed';
const CANCELLED_STATUS = 'Cancelled';

export async function getRevenueByMonth(supplierId, year) {
  const [rows] = await pool.query(
    `
      SELECT 
        MONTH(so.orderDate) AS month,
        SUM((od.quantity * od.unitPrice) - IFNULL(od.discount, 0)) AS revenue,
        COUNT(DISTINCT so.salesOrderId) AS orders
      FROM SalesOrder so
      JOIN OrderDetail od ON od.salesOrderId = so.salesOrderId
      JOIN Product p ON p.productId = od.productId
      WHERE p.supplierId = ?
        AND YEAR(so.orderDate) = ?
        AND so.status = ?
      GROUP BY MONTH(so.orderDate)
      ORDER BY month
    `,
    [supplierId, year, COMPLETED_STATUS]
  );

  // đảm bảo đủ 12 tháng
  const result = Array.from({ length: 12 }, (_, idx) => ({
    month: idx + 1,
    revenue: 0,
    orders: 0,
  }));

  rows.forEach((r) => {
    const i = r.month - 1;
    result[i] = {
      month: r.month,
      revenue: Number(r.revenue) || 0,
      orders: Number(r.orders) || 0,
    };
  });

  return result;
}

export async function getTopProducts(supplierId, { limit = 5, from, to }) {
  const params = [supplierId];
  let dateFilter = '';
  if (from) {
    dateFilter += ' AND so.orderDate >= ?';
    params.push(from);
  }
  if (to) {
    dateFilter += ' AND so.orderDate <= ?';
    params.push(to);
  }

  params.push(limit);

  const [rows] = await pool.query(
    `
      SELECT 
        p.productId,
        p.productName,
        p.imageUrl,
        SUM(od.quantity) AS totalQty,
        SUM((od.quantity * od.unitPrice) - IFNULL(od.discount,0)) AS totalRevenue
      FROM SalesOrder so
      JOIN OrderDetail od ON od.salesOrderId = so.salesOrderId
      JOIN Product p ON p.productId = od.productId
      WHERE p.supplierId = ?
        AND so.status = ?
        ${dateFilter}
      GROUP BY p.productId, p.productName, p.imageUrl
      ORDER BY totalRevenue DESC
      LIMIT ?
    `,
    [supplierId, COMPLETED_STATUS, ...params]
  );

  return rows.map((r) => ({
    productId: r.productId,
    productName: r.productName,
    imageUrl: r.imageUrl,
    totalQty: Number(r.totalQty) || 0,
    totalRevenue: Number(r.totalRevenue) || 0,
  }));
}

export async function getOrderCompletion(supplierId, { from, to }) {
  const params = [supplierId];
  let dateFilter = '';
  if (from) {
    dateFilter += ' AND so.orderDate >= ?';
    params.push(from);
  }
  if (to) {
    dateFilter += ' AND so.orderDate <= ?';
    params.push(to);
  }

  const [rows] = await pool.query(
    `
      SELECT so.status, COUNT(DISTINCT so.salesOrderId) AS count
      FROM SalesOrder so
      JOIN OrderDetail od ON od.salesOrderId = so.salesOrderId
      JOIN Product p ON p.productId = od.productId
      WHERE p.supplierId = ?
        ${dateFilter}
      GROUP BY so.status
    `,
    [supplierId, ...params]
  );

  const counts = {
    completed: 0,
    cancelled: 0,
    pending: 0,
  };

  rows.forEach((r) => {
    if (r.status === COMPLETED_STATUS) counts.completed += Number(r.count) || 0;
    else if (r.status === CANCELLED_STATUS) counts.cancelled += Number(r.count) || 0;
    else counts.pending += Number(r.count) || 0;
  });

  const total = counts.completed + counts.cancelled + counts.pending;
  const completionRate = total > 0 ? (counts.completed / total) * 100 : 0;

  return {
    ...counts,
    completionRate: Number(completionRate.toFixed(2)),
  };
}
