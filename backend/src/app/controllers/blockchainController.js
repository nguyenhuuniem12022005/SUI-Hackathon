import * as blockchainService from '../services/blockchainService.js';
import * as userService from '../services/userService.js';

export async function getGreenCreditSummary(req, res, next) {
  try {
    const data = await blockchainService.getGreenCreditSummary(req.user?.userId);
    return res.status(200).json({
      success: true,
      message: 'Fetch green credit summary successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function requestGreenCreditSync(req, res, next) {
  try {
    const data = await blockchainService.requestGreenCreditSync(req.user?.userId, req.body?.reason);
    return res.status(200).json({
      success: true,
      message: 'Green credit on-chain sync has been queued',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listDeveloperApps(req, res, next) {
  try {
    const data = await blockchainService.getDeveloperApps(req.user?.userId);
    return res.status(200).json({
      success: true,
      message: 'Fetch developer apps successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function registerDeveloperApp(req, res, next) {
  try {
    const payload = {
      ...req.body,
      ownerId: req.user?.userId,
    };
    const data = await blockchainService.registerDeveloperApp(payload);
    return res.status(201).json({
      success: true,
      message: 'Developer app registered successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getDeveloperMetrics(req, res, next) {
  try {
    const data = await blockchainService.getDeveloperMetrics(req.user?.userId);
    return res.status(200).json({
      success: true,
      message: 'Fetch developer metrics successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function executeSimpleToken(req, res, next) {
  try {
    // ép caller phải trùng với ví đã liên kết (nếu có)
    const userWallet = await userService.getWalletInfo(req.user?.userId).catch(() => null);
    const linkedWallet = userWallet?.walletAddress?.toLowerCase();

    const payload = {
      caller: linkedWallet || req.body.caller,
      method: req.body.method || req.body?.inputData?.function,
      args: req.body?.inputData?.args ?? req.body.args ?? [],
      value: req.body.value || 0,
      contractAddress: req.body.contractAddress,
      userId: req.user?.userId,
      rawInputData: typeof req.body.inputData === 'string' ? req.body.inputData : undefined,
    };
    if (linkedWallet && payload.caller?.toLowerCase() !== linkedWallet) {
      return res.status(400).json({
        success: false,
        message: 'Caller phải trùng ví đã liên kết.',
      });
    }
    const data = await blockchainService.executeSimpleToken(payload);
    return res.status(200).json({
      success: true,
      message: 'Thực thi hợp đồng SimpleToken thành công',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listSimpleTokenHistory(req, res, next) {
  try {
    const caller = req.body.caller || req.query.caller;
    const limit = req.body.limit || req.query.limit;
    const data = await blockchainService.listHscoinContractCalls({ caller, limit });
    return res.status(200).json({
      success: true,
      message: 'Lấy lịch sử HScoin thành công',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listSimpleTokenAlerts(req, res, next) {
  try {
    const payload = {
      severity: req.body.severity || req.query.severity,
      limit: req.body.limit || req.query.limit,
    };
    const data = await blockchainService.listHscoinAlerts(payload);
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách cảnh báo HScoin thành công',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listHscoinAdminCalls(req, res, next) {
  try {
    const data = await blockchainService.listHscoinAdminCalls({
      status: req.query.status || req.body.status,
      limit: req.query.limit || req.body.limit,
    });
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}


export async function retryHscoinCall(req, res, next) {
  try {
    const callId = req.params.callId || req.body.callId;
    const data = await blockchainService.retryHscoinCall(callId);
    return res.status(200).json({ success: true, message: 'Retry HScoin call thành công', data });
  } catch (error) {
    return next(error);
  }
}

export async function verifyHscoinCallTxHash(req, res, next) {
  try {
    const callId = req.params.callId || req.body.callId;
    const data = await blockchainService.verifyHscoinCallTxHash(callId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}
export async function compileContract(req, res, next) {
  try {
    const payload = {
      sourceCode: req.body.sourceCode,
      contractName: req.body.contractName,
    };
    const data = await blockchainService.compileContract(payload);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function deployContract(req, res, next) {
  try {
    const wallet = await userService.getWalletInfo(req.user?.userId).catch(() => null);
    const linkedWallet = wallet?.walletAddress;
    if (!linkedWallet) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng liên kết ví HScoin trước khi deploy contract.',
      });
    }
    const payload = {
      deployer: linkedWallet,
      sourceCode: req.body.sourceCode,
      contractName: req.body.contractName,
      abi: req.body.abi,
      bytecode: req.body.bytecode,
      setDefault: true,
      userId: req.user?.userId,
    };
    const data = await blockchainService.deployContract(payload);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function autoDeployDefaultContract(req, res, next) {
  try {
    const wallet = await userService.getWalletInfo(req.user?.userId).catch(() => null);
    const linkedWallet = wallet?.walletAddress;
    if (!linkedWallet) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng liên kết ví HScoin trước khi deploy contract.',
      });
    }
    const data = await blockchainService.autoDeployDefaultContract({
      deployer: linkedWallet,
      userId: req.user?.userId,
    });
    return res.status(200).json({
      success: true,
      message: 'Đã tự động compile và deploy contract PMarket thành công!',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function saveUserContract(req, res, next) {
  try {
    const payload = {
      ...req.body,
      userId: req.user?.userId,
    };
    const data = await blockchainService.saveUserContract(payload);
    return res.status(201).json({
      success: true,
      message: 'Đã lưu contract HScoin',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMyAccountBalance(req, res, next) {
  try {
    const wallet = await userService.getWalletInfo(req.user?.userId).catch(() => null);
    const address = wallet?.walletAddress;
    if (!address) {
      return res.status(400).json({ success: false, message: 'Vui lòng liên kết ví HScoin trước.' });
    }
    const account = await blockchainService.getAccountByAddress(address);
    return res.status(200).json({
      success: true,
      data: {
        address,
        balance: account?.balance ?? null,
        nonce: account?.nonce ?? null,
        isContract: account?.isContract ?? false,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMyTokenBalance(req, res, next) {
  try {
    const wallet = await userService.getWalletInfo(req.user?.userId).catch(() => null);
    const address = wallet?.walletAddress;
    if (!address) {
      return res.status(400).json({ success: false, message: 'Vui lòng liên kết ví HScoin trước.' });
    }
    const requestedContract = req.query.contractAddress;
    let resolvedContract = requestedContract || null;
    if (!requestedContract) {
      try {
        resolvedContract = await blockchainService.resolveContractForBalance({
          userId: req.user?.userId,
          contractAddress: null,
          walletAddress: address,
        });
      } catch {
        resolvedContract = null;
      }
    }

    const balanceResult = await blockchainService.getTokenBalance({
      contractAddress: resolvedContract || undefined,
      walletAddress: address,
    });
    const balance =
      typeof balanceResult === 'object' && balanceResult !== null ? balanceResult.balance : balanceResult;
    const source =
      typeof balanceResult === 'object' && balanceResult !== null ? balanceResult.source : null;
    return res.status(200).json({
      success: true,
      data: {
        address,
        contractAddress: resolvedContract,
        balance,
        source,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function listUserContracts(req, res, next) {
  try {
    const data = await blockchainService.listUserContracts(req.user?.userId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}
