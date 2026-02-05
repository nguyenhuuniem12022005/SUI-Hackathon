import pool from '../../configs/mysql.js';
import * as referralService from './referralService.js';
import * as userService from './userService.js';

const REFERRAL_REWARD_CONFIG = {
  referrer: {
    reputation: 5,
    greenCredit: 0,
  },
  referred: {
    reputation: 5,
    greenCredit: 10,
  },
};

async function fetchOrderContext(orderId) {
  const [rows] = await pool.query(
    `
    select
      so.salesOrderId,
      so.customerId,
      so.status,
      so.totalAmount,
      u.userId,
      u.referredByToken,
      u.userName,
      u.email
    from SalesOrder so
    join User u on u.userId = so.customerId
    where so.salesOrderId = ?
    limit 1
    `,
    [orderId]
  );
  return rows[0];
}

export async function handleReferralAfterOrderCompleted(orderId) {
  const context = await fetchOrderContext(orderId);
  if (!context) {
    return { handled: false, reason: 'ORDER_NOT_FOUND' };
  }
  if (!context.referredByToken) {
    return { handled: false, reason: 'NO_REFERRAL_TOKEN' };
  }

  const referrer = await referralService.findReferrerByToken(context.referredByToken);
  if (!referrer) {
    return { handled: false, reason: 'REFERRER_NOT_FOUND' };
  }

  const referralRecord = await referralService.markReferralQualified({
    referrerId: referrer.userId,
    referredUserId: context.customerId,
  });

  if (!referralRecord) {
    return { handled: false, reason: 'REFERRAL_NOT_FOUND' };
  }

  if (referralRecord.status === 'REWARDED') {
    return {
      handled: true,
      alreadyRewarded: true,
      referralId: referralRecord.referralId,
    };
  }

  const rewardsLogged = [];

  if (REFERRAL_REWARD_CONFIG.referrer.reputation > 0) {
    await referralService.rewardReferral({
      referrerId: referrer.userId,
      referralId: referralRecord.referralId,
      rewardType: 'REPUTATION',
      amount: REFERRAL_REWARD_CONFIG.referrer.reputation,
      note: `Thưởng referral cho đơn #${orderId}`,
    });
    await userService.updateReputationScore(referrer.userId, REFERRAL_REWARD_CONFIG.referrer.reputation);
    rewardsLogged.push('referrer-reputation');
  }

  if (REFERRAL_REWARD_CONFIG.referrer.greenCredit > 0) {
    await referralService.rewardReferral({
      referrerId: referrer.userId,
      referralId: referralRecord.referralId,
      rewardType: 'GREEN_CREDIT',
      amount: REFERRAL_REWARD_CONFIG.referrer.greenCredit,
      note: `Thưởng green credit cho đơn #${orderId}`,
    });
    await userService.updateGreenCredit(referrer.userId, REFERRAL_REWARD_CONFIG.referrer.greenCredit);
    rewardsLogged.push('referrer-green');
  }

  if (REFERRAL_REWARD_CONFIG.referred.reputation > 0) {
    await userService.updateReputationScore(context.customerId, REFERRAL_REWARD_CONFIG.referred.reputation);
  }

  if (REFERRAL_REWARD_CONFIG.referred.greenCredit > 0) {
    await userService.updateGreenCredit(context.customerId, REFERRAL_REWARD_CONFIG.referred.greenCredit);
  }

  return {
    handled: true,
    alreadyRewarded: false,
    referralId: referralRecord.referralId,
    rewardsLogged,
  };
}
