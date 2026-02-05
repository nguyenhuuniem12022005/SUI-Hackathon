import pool from '../../configs/mysql.js';
import ApiError from '../../utils/classes/api-error.js';

async function ensureRow(userId) {
  await pool.query(
    `insert into UserBalance (userId, availableBalance, lockedBalance)
     values (?, 0, 0)
     on duplicate key update userId = userId`,
    [userId]
  );
}

export async function adjustBalance(userId, { availableDelta = 0, lockedDelta = 0 } = {}) {
  if (!userId) {
    throw ApiError.badRequest('Thiếu userId để cập nhật số dư');
  }
  await ensureRow(userId);
  await pool.query(
    `update UserBalance
       set availableBalance = greatest(0, availableBalance + ?),
           lockedBalance = greatest(0, lockedBalance + ?),
           updatedAt = now()
     where userId = ?`,
    [availableDelta, lockedDelta, userId]
  );
  const [rows] = await pool.query(
    `select availableBalance, lockedBalance from UserBalance where userId = ? limit 1`,
    [userId]
  );
  return rows[0] || { availableBalance: 0, lockedBalance: 0 };
}

export async function getBalance(userId) {
  if (!userId) {
    throw ApiError.badRequest('Thiếu userId');
  }
  await ensureRow(userId);
  const [rows] = await pool.query(
    `select availableBalance, lockedBalance from UserBalance where userId = ? limit 1`,
    [userId]
  );
  return rows[0] || { availableBalance: 0, lockedBalance: 0 };
}
