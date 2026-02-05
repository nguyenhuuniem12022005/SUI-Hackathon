import Joi from 'joi';

export const registerDeveloperApp = Joi.object({
  name: Joi.string().trim().min(3).max(100).required().label('Tên ứng dụng'),
  quota: Joi.number().integer().positive().max(100000).default(1000).label('Quota mỗi ngày'),
  origins: Joi.array().items(Joi.string().uri().trim()).min(1).required().label('Allowed origins'),
});

export const requestGreenCreditSync = Joi.object({
  reason: Joi.string().trim().max(255).allow('', null).label('Lý do đồng bộ'),
});

export const executeSimpleToken = Joi.object({
  caller: Joi.string().trim().required().label('Caller address'),
  value: Joi.number().integer().min(0).default(0).label('Giá trị HScoin'),
  method: Joi.string().trim().label('Tên hàm'),
  args: Joi.array().default([]).label('Danh sách tham số'),
  contractAddress: Joi.string().trim().optional().label('Địa chỉ hợp đồng'),
  // Cho phép inputData là object {function,args} hoặc raw string calldata
  inputData: Joi.alternatives()
    .try(
      Joi.object({
        function: Joi.string().trim().required(),
        args: Joi.array().default([]),
      }),
      Joi.string().trim()
    )
    .optional(),
});

export const listSimpleTokenHistory = Joi.object({
  caller: Joi.string().trim().required().label('Caller address'),
  limit: Joi.number().integer().min(1).max(100).default(20).label('Số bản ghi'),
});

export const listSimpleTokenAlerts = Joi.object({
  severity: Joi.string().valid('info', 'warning', 'critical').label('Mức cảnh báo'),
  limit: Joi.number().integer().min(1).max(200).default(50).label('Số bản ghi'),
});

export const saveUserContract = Joi.object({
  name: Joi.string().trim().min(2).max(120).required().label('Tên contract'),
  address: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .label('Địa chỉ contract'),
  network: Joi.string().trim().max(60).default('HScoin Devnet').label('Mạng'),
  isDefault: Joi.boolean().default(false).label('Đặt làm mặc định'),
});

export const compileContract = Joi.object({
  sourceCode: Joi.string().required().label('Source code'),
  contractName: Joi.string().trim().min(2).max(120).required().label('Tên contract'),
});

export const deployContract = Joi.object({
  sourceCode: Joi.string().required().label('Source code'),
  contractName: Joi.string().trim().min(2).max(120).required().label('Tên contract'),
  abi: Joi.any().optional(),
  bytecode: Joi.string().optional(),
});
