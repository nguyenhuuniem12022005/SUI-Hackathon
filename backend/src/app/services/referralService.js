import crypto from 'crypto';
import pool from '../../configs/mysql.js';
import ApiError from '../../utils/classes/api-error.js';

async function referralTokenExists(token) {
  const [rows] = await pool.query(
    'select userId from User where referralToken = ? limit 1',
    [token]
  );
  return rows.length > 0;
}

export async function generateUniqueReferralToken(seed = '') {
  let token = '';
  let attempts = 0;
  do {
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    const prefix = seed ? seed.slice(0, 2).toUpperCase() : 'PM';
    token = `PMKT-${prefix}${random}`.slice(0, 20);
    attempts += 1;
    if (attempts > 10) {
      token = `PMKT-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
    }
  } while (await referralTokenExists(token));
  return token;
}

export async function findReferrerByToken(token) {
  if (!token) return null;
  const [rows] = await pool.query(
    'select userId, referralToken from User where referralToken = ? limit 1',
    [token]
  );
  return rows[0] || null;
}

export async function createReferralTracking({ referrerId, referredUserId, referralToken }) {
  if (!referrerId || !referredUserId || !referralToken) return;
  await pool.query(
    `insert into ReferralTracking (referrerId, referredUserId, referralToken)
     values (?, ?, ?)
     on duplicate key update referralToken = values(referralToken)`,
    [referrerId, referredUserId, referralToken]
  );
}

async function getReferralById(referralId) {
  const [rows] = await pool.query(
    `select rt.*, u.userName, u.email
     from ReferralTracking rt
     join User u on rt.referredUserId = u.userId
     where rt.referralId = ?
     limit 1`,
    [referralId]
  );
  return rows[0] || null;
}

async function findReferralPair(referrerId, referredUserId) {
  const [rows] = await pool.query(
    `select * from ReferralTracking
     where referrerId = ? and referredUserId = ?
     limit 1`,
    [referrerId, referredUserId]
  );
  return rows[0] || null;
}

export async function getReferralSummary(userId) {
  const [userRows] = await pool.query(
    'select referralToken, referredByToken from User where userId = ? limit 1',
    [userId]
  );
  if (userRows.length === 0) {
    throw ApiError.notFound('Không tìm thấy người dùng');
  }
  const user = userRows[0];

  const [referrals] = await pool.query(
    `select rt.referralId, rt.referredUserId, rt.referrerId, rt.status, rt.createdAt, rt.qualifiedAt,
            rt.rewardedAt, rt.referralToken, rt.rewardTxHash, u.userName, u.email
     from ReferralTracking rt
     join User u on rt.referredUserId = u.userId
     where rt.referrerId = ?
     order by rt.createdAt desc`,
    [userId]
  );

  const [statsRows] = await pool.query(
    `select
        sum(status = 'REGISTERED') as registered,
        sum(status = 'QUALIFIED') as qualified,
        sum(status = 'REWARDED') as rewarded
     from ReferralTracking
     where referrerId = ?`,
    [userId]
  );
  const stats = statsRows[0] || { registered: 0, qualified: 0, rewarded: 0 };

  const [rewardTotalsRows] = await pool.query(
    `select
        ifnull(sum(case when rewardType = 'REPUTATION' then amount end), 0) as reputationRewards,
        ifnull(sum(case when rewardType = 'GREEN_CREDIT' then amount end), 0) as greenCreditRewards,
        ifnull(sum(case when rewardType = 'TOKEN' then amount end), 0) as tokenRewards,
        ifnull(sum(amount), 0) as totalRewards
     from ReferralRewardLog
     where referralId in (
        select referralId from ReferralTracking where referrerId = ?
     )`,
    [userId]
  );

  const referredBy = user.referredByToken
    ? (
        await pool.query(
          'select userId, userName, email from User where referralToken = ? limit 1',
          [user.referredByToken]
        )
      )[0][0]
    : null;

  return {
    referralToken: user.referralToken,
    referredBy,
    stats: {
      registered: Number(stats.registered || 0),
      qualified: Number(stats.qualified || 0),
      rewarded: Number(stats.rewarded || 0),
    },
    rewards: {
      reputation: Number(rewardTotalsRows[0]?.reputationRewards || 0),
      greenCredit: Number(rewardTotalsRows[0]?.greenCreditRewards || 0),
      token: Number(rewardTotalsRows[0]?.tokenRewards || 0),
      total: Number(rewardTotalsRows[0]?.totalRewards || 0),
    },
    referrals,
  };
}

export async function markReferralQualified({ referrerId, referredUserId }) {
  const referral = await findReferralPair(referrerId, referredUserId);
  if (!referral) {
    throw ApiError.notFound('Referral không tồn tại.');
  }
  if (referral.status === 'REWARDED') {
    return referral;
  }
  await pool.query(
    `update ReferralTracking
     set status = 'QUALIFIED', qualifiedAt = now()
     where referralId = ?`,
    [referral.referralId]
  );
  return await getReferralById(referral.referralId);
}

export async function rewardReferral({ referrerId, referralId, rewardType, amount, note, txHash }) {
  const referral = await getReferralById(referralId);
  if (!referral || referral.referrerId !== referrerId) {
    throw ApiError.forbidden('Bạn không có quyền thưởng referral này.');
  }

  await pool.query(
    `insert into ReferralRewardLog (referralId, rewardType, amount, note, txHash)
     values (?, ?, ?, ?, ?)`,
    [referralId, rewardType, amount, note || null, txHash || null]
  );

  await pool.query(
    `update ReferralTracking
     set status = 'REWARDED', rewardedAt = now(), rewardTxHash = coalesce(?, rewardTxHash)
     where referralId = ?`,
    [txHash || null, referralId]
  );

  return await getReferralById(referralId);
}

export async function listReferralRewards(userId) {
  const [rows] = await pool.query(
    `select rrl.*, rt.referrerId, rt.referredUserId
     from ReferralRewardLog rrl
     join ReferralTracking rt on rrl.referralId = rt.referralId
     where rt.referrerId = ?
     order by rrl.createdAt desc`,
    [userId]
  );
  return rows;
}
