import Joi from 'joi';

export const markQualified = Joi.object({
  referredUserId: Joi.number().integer().positive().required().label('Người được giới thiệu'),
});

export const rewardReferral = Joi.object({
  referralId: Joi.number().integer().positive().required().label('Referral ID'),
  rewardType: Joi.string()
    .valid('REPUTATION', 'GREEN_CREDIT', 'TOKEN')
    .required()
    .label('Loại thưởng'),
  amount: Joi.number().integer().positive().required().label('Giá trị thưởng'),
  note: Joi.string().trim().max(255).allow('', null).label('Ghi chú'),
  txHash: Joi.string().trim().max(100).allow('', null).label('Transaction Hash'),
});
