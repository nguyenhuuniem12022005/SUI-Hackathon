import * as referralService from '../services/referralService.js';

export async function getMyReferralSummary(req, res, next) {
  try {
    const data = await referralService.getReferralSummary(req.user?.userId);
    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin referral thành công',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function markReferralQualified(req, res, next) {
  try {
    const data = await referralService.markReferralQualified({
      referrerId: req.user?.userId,
      referredUserId: req.body?.referredUserId,
    });
    return res.status(200).json({
      success: true,
      message: 'Cập nhật referral sang trạng thái qualified',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function rewardReferral(req, res, next) {
  try {
    const data = await referralService.rewardReferral({
      referrerId: req.user?.userId,
      referralId: req.body?.referralId,
      rewardType: req.body?.rewardType,
      amount: req.body?.amount,
      note: req.body?.note,
      txHash: req.body?.txHash,
    });
    return res.status(200).json({
      success: true,
      message: 'Ghi nhận thưởng referral thành công',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listReferralRewards(req, res, next) {
  try {
    const data = await referralService.listReferralRewards(req.user?.userId);
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách thưởng referral thành công',
      data,
    });
  } catch (error) {
    return next(error);
  }
}
