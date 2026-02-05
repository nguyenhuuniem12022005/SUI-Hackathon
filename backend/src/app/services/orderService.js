import pool from '../../configs/mysql.js';
import ApiError from '../../utils/classes/api-error.js';
import { handleReferralAfterOrderCompleted } from './referralAutomationService.js';
import {
  getEscrowSnapshot,
  executeSimpleToken,
  attachOrderToHscoinCall,
  ensureUserEscrowContract,
} from './blockchainService.js';
import * as userService from './userService.js';
import { adjustBalance } from './userBalanceService.js';

// Fixed rewards to tránh lạm phát: mỗi bên +5 uy tín; đơn hàng xanh người bán +5 Green Credit
const REPUTATION_REWARD_BUYER = 5;
const REPUTATION_REWARD_SELLER = 5;
const GREEN_CREDIT_SELLER_GREEN_ORDER = 5;
const MIN_REPUTATION_TO_BUY = Number(process.env.MIN_BUYER_REPUTATION || 65);
const HSC_RATE_VND = Number(process.env.HSC_RATE_VND || 2170); // 1 HSC = 2.170 VND
const HSC_DECIMALS = Number(process.env.HSC_DECIMALS || 18);
const DECIMAL_FACTOR = 10n ** BigInt(HSC_DECIMALS);

async function getOrderById(orderId) {
  const [rows] = await pool.query(
    `
    select salesOrderId, customerId, shipperId, status, totalAmount, shippingAddress, orderDate, deliveryDate, isGreen, isGreenConfirmed
    from SalesOrder
    where salesOrderId = ?
    limit 1
    `,
    [orderId]
  );
  return rows[0] || null;
}

function toBool(val) {
  return String(val) === '1' || val === true;
}

async function ensureAndReserveStock(productId, quantity) {
  const qty = Math.max(1, Number(quantity) || 1);
  const [stores] = await pool.query(
    `
    select warehouseId, quantity
    from Store
    where productId = ?
    order by quantity desc, warehouseId asc
    `,
    [productId]
  );

  const total = stores.reduce((acc, cur) => acc + (Number(cur.quantity) || 0), 0);
  if (total < qty) {
    throw ApiError.badRequest('Sản phẩm không đủ tồn kho cho số lượng yêu cầu.');
  }

  let remaining = qty;
  const deductions = [];
  for (const store of stores) {
    if (remaining <= 0) break;
    const available = Math.max(0, Number(store.quantity) || 0);
    const take = Math.min(available, remaining);
    if (take > 0) {
      await pool.query(
        `
        update Store
        set quantity = quantity - ?
        where productId = ? and warehouseId = ? and quantity >= ?
        `,
        [take, productId, store.warehouseId, take]
      );
      remaining -= take;
      deductions.push({ warehouseId: store.warehouseId, amount: take });
    }
  }
  return deductions;
}

function convertVndToWei(vndAmount) {
  const rate = HSC_RATE_VND > 0 ? HSC_RATE_VND : 2170;
  // Dùng milli-VND để giảm sai số khi chia cho rate thập phân
  const scaledVnd = BigInt(Math.round(Number(vndAmount || 0) * 1000));
  const scaledRate = BigInt(Math.round(rate * 1000));
  if (scaledRate === 0n) {
    throw ApiError.badRequest('Tỷ giá HScoin không hợp lệ');
  }
  return (scaledVnd * DECIMAL_FACTOR) / scaledRate;
}

async function getBuyerWalletAddress(order) {
  const info = await userService.getWalletInfo(order.customerId);
  if (!info?.walletAddress) {
    throw ApiError.badRequest('Người mua chưa liên kết ví HScoin. Không thể giải phóng escrow.');
  }
  return info.walletAddress;
}

async function getSellerWalletAddress(orderId) {
  const sellerIds = await getOrderSellerIds(orderId);
  if (!sellerIds.length) {
    throw ApiError.badRequest('Không tìm thấy người bán cho đơn hàng.');
  }
  const sellerInfo = await userService.getWalletInfo(sellerIds[0]);
  if (!sellerInfo?.walletAddress) {
    throw ApiError.badRequest('Người bán chưa liên kết ví HScoin. Không thể giải phóng escrow.');
  }
  return sellerInfo.walletAddress;
}

async function getOrderContractAddress(orderId) {
  const [rows] = await pool.query(
    `
    select payload
    from HscoinContractCall
    where orderId = ? and method = 'deposit'
    order by createdAt desc
    limit 1
    `,
    [orderId]
  );
  if (!rows.length) return null;
  try {
    const payload = JSON.parse(rows[0].payload || '{}');
    if (payload?.contractAddress) {
      return String(payload.contractAddress).toLowerCase();
    }
    if (payload?.body?.contractAddress) {
      return String(payload.body.contractAddress).toLowerCase();
    }
  } catch (err) {
    // ignore parse errors
  }
  return null;
}

async function getLatestEscrowState(orderId) {
  const [[ledgerRow]] = await pool.query(
    `
    select status
    from EscrowLedger
    where salesOrderId = ?
    order by createdAt desc
    limit 1
    `,
    [orderId]
  );

  const [[callRow]] = await pool.query(
    `
    select status
    from HscoinContractCall
    where orderId = ?
    order by updatedAt desc
    limit 1
    `,
    [orderId]
  );

  return {
    ledgerStatus: ledgerRow?.status || null,
    callStatus: callRow?.status || null,
  };
}

async function getOrderSellerIds(orderId) {
  const [rows] = await pool.query(
    `
    select distinct p.supplierId
    from OrderDetail od
    join Product p on p.productId = od.productId
    where od.salesOrderId = ?
    `,
    [orderId]
  );
  return rows
    .map((row) => Number(row.supplierId))
    .filter((supplierId) => Number.isFinite(supplierId));
}

async function updateOrderStatus(orderId, status) {
  const [result] = await pool.query(
    `
    update SalesOrder
    set status = ?
    where salesOrderId = ?
    `,
    [status, orderId]
  );
  if (result.affectedRows === 0) {
    throw ApiError.notFound('Không tìm thấy đơn hàng');
  }
  return getOrderById(orderId);
}

export async function createEscrowOrder({
  customerId,
  productId,
  quantity = 1,
  walletAddress,
  shippingAddress,
  contractAddress,
}) {
  if (!customerId) {
    throw ApiError.badRequest('Thiếu thông tin người mua');
  }
  if (!walletAddress) {
    throw ApiError.badRequest('Vui lòng kết nối ví HScoin trước khi đặt hàng');
  }
  const qty = Math.max(1, Number(quantity) || 1);
  const [products] = await pool.query(
    `
    select productId, supplierId, productName, unitPrice, status, discount, imageURL, coalesce(isGreen, 0) as isGreen
    from Product
    where productId = ?
    limit 1
    `,
    [productId]
  );
  const product = products[0];
  if (!product) {
    throw ApiError.notFound('Không tìm thấy sản phẩm');
  }
  if (product.status !== 'Active') {
    throw ApiError.badRequest('Sản phẩm chưa sẵn sàng để đặt hàng');
  }
  const stockDeductions = await ensureAndReserveStock(product.productId, qty);
  // Không cho phép mua sản phẩm của chính mình
if (Number(product.supplierId) === Number(customerId)) {
    throw ApiError.badRequest('Bạn không thể mua sản phẩm của chính mình.');
}

  const [users] = await pool.query(
    `
    select address, reputationScore
    from User
    where userId = ?
    limit 1
    `,
    [customerId]
  );
  const resolvedAddress = (shippingAddress || users[0]?.address || '').trim();
  if (!resolvedAddress) {
    throw ApiError.badRequest('Vui lòng cập nhật địa chỉ giao hàng trước khi đặt hàng.');
  }
  const buyerReputation = Number(users[0]?.reputationScore || 0);
  if (buyerReputation < MIN_REPUTATION_TO_BUY) {
    throw ApiError.forbidden(
      `Bạn cần tối thiểu ${MIN_REPUTATION_TO_BUY} điểm uy tín để đặt mua sản phẩm. Vui lòng quy đổi thêm bằng Green Credit trước khi mua.`
    );
  }

  const unitPrice = Number(product.unitPrice) || 0;
  const totalAmount = unitPrice * qty;

  // Lấy địa chỉ ví của seller
  const [sellerRows] = await pool.query(
    `select walletAddress from User where userId = ? limit 1`,
    [product.supplierId]
  );
  const sellerWalletAddress = sellerRows[0]?.walletAddress;
  if (!sellerWalletAddress) {
    throw ApiError.badRequest('Người bán chưa liên kết ví HScoin. Không thể tạo đơn hàng.');
  }

  // Tạo đơn hàng trước để lấy orderId cho escrow
  const paymentMethodId = 1;
  const [orderResult] = await pool.query(
    `
    insert into SalesOrder (customerId, shipperId, paymentMethodId, feeShipping, shippingAddress, status, totalAmount, isGreen, isGreenConfirmed)
    values (?, null, ?, 0, ?, 'Pending', ?, ?, 0)
    `,
    [customerId, paymentMethodId, resolvedAddress, totalAmount, product.isGreen ? 1 : 0]
  );
  const orderId = orderResult.insertId;

  await pool.query(
    `
    insert into OrderDetail (productId, salesOrderId, discount, weightPerItem, quantity, unitPrice)
    values (?, ?, ?, ?, ?, ?)
    `,
    [product.productId, orderId, Number(product.discount) || 0, null, qty, unitPrice]
  );

  // Cập nhật số dư: Buyer chuyển available -> locked
  try {
    await adjustBalance(customerId, { availableDelta: -Number(totalAmount), lockedDelta: +Number(totalAmount) });
  } catch (e) {
    // Nếu lỗi thì rollback đơn hàng tối thiểu
    await pool.query('delete from OrderDetail where salesOrderId = ?', [orderId]);
    await pool.query('delete from SalesOrder where salesOrderId = ?', [orderId]);
    throw e;
  }

  // Gọi deposit() để khóa tiền vào escrow
  let escrowCallId = null;
  let escrowStatus = 'SUCCESS';
  const amountWei = convertVndToWei(totalAmount);
  const escrowContract = await ensureUserEscrowContract({
    userId: customerId,
    walletAddress,
    contractAddress,
  });
  try {
    const depositResult = await executeSimpleToken({
      caller: walletAddress,
      method: 'deposit',
      args: [orderId, sellerWalletAddress, amountWei],
      value: 0, // dùng token nội bộ, không gửi native coin
      contractAddress,
      userId: customerId,
      useCalldataFormat: true, // Dùng format inputData (calldata hex) như HSCOIN
    });
    escrowCallId = depositResult?.callId || null;
    escrowStatus = depositResult?.status || 'SUCCESS';
  } catch (error) {
    if (error.statusCode === 503 && error.hscoinCallId) {
      escrowCallId = error.hscoinCallId;
      escrowStatus = 'QUEUED';
    } else {
      // Rollback nếu deposit thất bại
      await pool.query('delete from OrderDetail where salesOrderId = ?', [orderId]);
      await pool.query('delete from SalesOrder where salesOrderId = ?', [orderId]);
      // trả lại tồn kho đã trừ
      if (stockDeductions?.length) {
        for (const d of stockDeductions) {
          await pool.query(`update Store set quantity = quantity + ? where productId = ? and warehouseId = ?`, [
            d.amount,
            product.productId,
            d.warehouseId,
          ]);
        }
      }
      // Hoàn lại số dư đã chuyển vào locked
      await adjustBalance(customerId, { availableDelta: +Number(totalAmount), lockedDelta: -Number(totalAmount) });
      throw error;
    }
  }

  if (escrowCallId) {
    await attachOrderToHscoinCall(escrowCallId, orderId);
  }

  await recordEscrowLedger(orderId, 'Pending', amountWei.toString());

  return {
    orderId,
    status: 'Pending',
    totalAmount,
    quantity: qty,
    hscoinCallId: escrowCallId,
    hscoinStatus: escrowStatus,
    product: {
      productId: product.productId,
      productName: product.productName,
      imageURL: product.imageURL,
    },
  };
}

async function recordEscrowLedger(orderId, status, amount) {
  const snapshot = await getEscrowSnapshot({ orderId, status, amount });
  await pool.query(
    `
    insert into EscrowLedger (salesOrderId, txHash, blockNumber, gasUsed, network, status)
    values (?, ?, ?, ?, ?, ?)
    `,
    [orderId, snapshot.txHash, snapshot.blockNumber, snapshot.gasUsed, snapshot.network, snapshot.status]
  );
}

export async function confirmOrderAsBuyer(orderId, buyerId, { isGreenApproved = false, walletAddress, contractAddress } = {}) {
  const normalizedBuyerId = Number(buyerId);
  if (!orderId || !normalizedBuyerId) {
    throw ApiError.badRequest('Thiếu thông tin người dùng hoặc đơn hàng');
  }
  const order = await getOrderById(orderId);
  if (!order) {
    throw ApiError.notFound('Không tìm thấy đơn hàng');
  }
  if (order.customerId !== normalizedBuyerId) {
    throw ApiError.forbidden('Bạn không phải người mua của đơn hàng này');
  }
  if (order.status === 'Cancelled') {
    throw ApiError.badRequest('Đơn hàng đã bị hủy');
  }

  const escrowState = await getLatestEscrowState(orderId);
  if ((escrowState.callStatus || '').toUpperCase() === 'FAILED') {
    throw ApiError.badRequest('Escrow HScoin đã thất bại. Vui lòng thử lại nạp escrow trước khi xác nhận đơn hàng.');
  }
  if (['PENDING', 'QUEUED', 'PROCESSING'].includes((escrowState.callStatus || '').toUpperCase())) {
    throw ApiError.badRequest('Escrow đang được xử lý, vui lòng đợi deposit hoàn tất rồi mới xác nhận.');
  }
  if (escrowState.ledgerStatus && escrowState.ledgerStatus !== 'LOCKED') {
    throw ApiError.badRequest('Trạng thái escrow chưa sẵn sàng để xác nhận.');
  }

  if (order.status === 'BuyerConfirmed') {
    throw ApiError.badRequest('Bạn đã xác nhận đơn hàng này trước đó');
  }
  if (order.status === 'Completed') {
    return { order, status: order.status, completed: true };
  }

  // Ghi nhận hành động xanh từ phía buyer (nếu sản phẩm là hành động xanh)
  const shouldMarkGreen = order.isGreen && isGreenApproved;
  if (shouldMarkGreen && !order.isGreenConfirmed) {
    await pool.query(
      `
      update SalesOrder
      set isGreenConfirmed = 1
      where salesOrderId = ?
      `,
      [orderId]
    );
    order.isGreenConfirmed = true;
  }

  if (order.status === 'SellerConfirmed') {
    await recordEscrowLedger(orderId, 'BuyerConfirmed', order.totalAmount);
    const buyerWallet = walletAddress || (await getBuyerWalletAddress(order));
    const completedOrder = await markOrderCompleted(orderId, {
      triggerReferral: true,
      walletAddress: buyerWallet,
      contractAddress,
    });
    return { order: completedOrder, status: completedOrder.status, completed: true };
  }

  const updatedOrder = await updateOrderStatus(orderId, 'BuyerConfirmed');
  await recordEscrowLedger(orderId, 'BuyerConfirmed', updatedOrder.totalAmount);
  return { order: updatedOrder, status: updatedOrder.status, completed: false };
}

export async function confirmOrderAsSeller(orderId, sellerId, { walletAddress, contractAddress } = {}) {
  const normalizedSellerId = Number(sellerId);
  if (!orderId || !normalizedSellerId) {
    throw ApiError.badRequest('Thiếu thông tin người dùng hoặc đơn hàng');
  }
  const order = await getOrderById(orderId);
  if (!order) {
    throw ApiError.notFound('Không tìm thấy đơn hàng');
  }
  if (order.status === 'Cancelled') {
    throw ApiError.badRequest('Đơn hàng đã bị hủy');
  }

  const escrowState = await getLatestEscrowState(orderId);
  if ((escrowState.callStatus || '').toUpperCase() === 'FAILED') {
    throw ApiError.badRequest('Escrow HScoin đã thất bại. Vui lòng thử lại nạp escrow trước khi xác nhận đơn hàng.');
  }
  if (['PENDING', 'QUEUED', 'PROCESSING'].includes((escrowState.callStatus || '').toUpperCase())) {
    throw ApiError.badRequest('Escrow đang được xử lý, vui lòng đợi deposit hoàn tất rồi mới xác nhận.');
  }
  if (escrowState.ledgerStatus && escrowState.ledgerStatus !== 'LOCKED') {
    throw ApiError.badRequest('Trạng thái escrow chưa sẵn sàng để xác nhận.');
  }

  if (order.status === 'SellerConfirmed') {
    throw ApiError.badRequest('Bạn đã xác nhận đơn hàng này trước đó');
  }
  if (order.status === 'Completed') {
    return { order, status: order.status, completed: true };
  }

  const sellerIds = await getOrderSellerIds(orderId);
  if (!sellerIds.length) {
    throw ApiError.badRequest('Đơn hàng không có thông tin người bán');
  }
  if (!sellerIds.includes(normalizedSellerId)) {
    throw ApiError.forbidden('Bạn không phải người bán của đơn hàng này');
  }

  if (order.status === 'BuyerConfirmed') {
    await recordEscrowLedger(orderId, 'SellerConfirmed', order.totalAmount);
    const buyerWallet = walletAddress || (await getBuyerWalletAddress(order));
    const completedOrder = await markOrderCompleted(orderId, {
      triggerReferral: true,
      walletAddress: buyerWallet,
      contractAddress,
    });
    return { order: completedOrder, status: completedOrder.status, completed: true };
  }

  const updatedOrder = await updateOrderStatus(orderId, 'SellerConfirmed');
  await recordEscrowLedger(orderId, 'SellerConfirmed', updatedOrder.totalAmount);
  return { order: updatedOrder, status: updatedOrder.status, completed: false };
}

export async function markOrderCompleted(orderId, { triggerReferral = true, walletAddress, contractAddress } = {}) {
  const orderBefore = await getOrderById(orderId);
  if (!orderBefore) {
    throw ApiError.notFound('Không tìm thấy đơn hàng');
  }

  // Gọi release() để giải phóng tiền cho seller; nếu fail thì không đánh dấu Completed
  const sellerWallet = await getSellerWalletAddress(orderId);
  const releaseWallet = sellerWallet;
  const releaseContract = contractAddress || (await getOrderContractAddress(orderId));
  if (!releaseContract) {
    throw ApiError.badRequest('Không xác định được contract escrow của đơn hàng.');
  }
  try {
    await executeSimpleToken({
      caller: releaseWallet,
      method: 'release',
      args: [orderId],
      value: 0,
      contractAddress: releaseContract,
      userId: orderBefore.customerId,
      useCalldataFormat: true, // Dùng format inputData (calldata hex) như HSCOIN
    });
  } catch (error) {
    console.error(`[Escrow] Release failed for order ${orderId}:`, error.message);
    throw ApiError.serviceUnavailable(
      'Giải phóng escrow thất bại. Vui lòng thử lại hoặc kiểm tra HScoin.'
    );
  }

  const order = await updateOrderStatus(orderId, 'Completed');

  // Cập nhật số dư off-chain: buyer locked giảm, seller available tăng
  try {
    await adjustBalance(order.customerId, { availableDelta: 0, lockedDelta: -Number(order.totalAmount) });
    const sellerIds = await getOrderSellerIds(orderId);
    if (sellerIds.length) {
      // Tạm thời chỉ lấy seller đầu tiên (multi-seller mở rộng sau)
      await adjustBalance(sellerIds[0], { availableDelta: +Number(order.totalAmount), lockedDelta: 0 });
    }
  } catch (e) {
    console.error('[UserBalance] Update failed after completion:', e.message);
    // Không throw để tránh block hoàn tất đơn, nhưng log lại để xử lý thủ công.
  }

  const rewardTasks = [];
  const greenBonus = order.isGreen && order.isGreenConfirmed ? GREEN_CREDIT_SELLER_GREEN_ORDER : 0;

  let sellerIds = [];
  const shouldLoadSellerIds =
    REPUTATION_REWARD_SELLER && REPUTATION_REWARD_SELLER !== 0;
  if (shouldLoadSellerIds) {
    sellerIds = await getOrderSellerIds(orderId);
  }

  if (order?.customerId && REPUTATION_REWARD_BUYER) {
    rewardTasks.push(
      userService.updateReputationScore(order.customerId, REPUTATION_REWARD_BUYER)
    );
  }

  const uniqueSellerIds = Array.from(new Set(sellerIds));

  if (uniqueSellerIds.length && REPUTATION_REWARD_SELLER) {
    for (const supplierId of uniqueSellerIds) {
      rewardTasks.push(
        userService.updateReputationScore(supplierId, REPUTATION_REWARD_SELLER)
      );
    }
  }

  // Green Credit: chỉ cộng cho người bán nếu đơn hàng xanh được buyer xác nhận (fixed 5)
  if (uniqueSellerIds.length && greenBonus > 0) {
    for (const supplierId of uniqueSellerIds) {
      rewardTasks.push(userService.updateGreenCredit(supplierId, greenBonus));
    }
  }

  if (rewardTasks.length > 0) {
    await Promise.all(rewardTasks);
  }

  if (triggerReferral) {
    await handleReferralAfterOrderCompleted(orderId);
  }
  await recordEscrowLedger(orderId, 'Completed', convertVndToWei(order.totalAmount).toString());
  return order;
}

export async function markOrderCancelled(orderId, { walletAddress, contractAddress } = {}) {
  const order = await updateOrderStatus(orderId, 'Cancelled');

  // Gọi refund() để hoàn tiền cho buyer
  const refundContract = contractAddress || (await getOrderContractAddress(orderId));
  const refundWallet = walletAddress || (await getBuyerWalletAddress(order));
  if (refundWallet && refundContract) {
    try {
      await executeSimpleToken({
        caller: refundWallet,
        method: 'refund',
        args: [orderId],
        value: 0, // refund không cần gửi thêm value
        contractAddress: refundContract,
        userId: order.customerId,
      });
    } catch (error) {
      console.error(`[Escrow] Refund failed for order ${orderId}:`, error.message);
    }
  }

  // Hoàn tiền về available, giảm locked cho buyer
  try {
    await adjustBalance(order.customerId, { availableDelta: +Number(order.totalAmount), lockedDelta: -Number(order.totalAmount) });
  } catch (e) {
    console.error('[UserBalance] Refund balance update failed:', e.message);
  }

  await recordEscrowLedger(orderId, 'Cancelled', order.totalAmount);
  return order;
}

function buildOrderActions({ status, isBuyer, isSeller }) {
  const completed = status === 'Completed' || status === 'Cancelled';
  const canConfirmAsBuyer =
    isBuyer && !completed && (status === 'Pending' || status === 'SellerConfirmed');
  const canConfirmAsSeller =
    isSeller && !completed && (status === 'Pending' || status === 'BuyerConfirmed');
  const waitingForSeller = status === 'BuyerConfirmed';
  const waitingForBuyer = status === 'SellerConfirmed';

  return {
    canConfirmAsBuyer,
    canConfirmAsSeller,
    waitingForSeller,
    waitingForBuyer,
  };
}

export async function getOrderDetail(orderId, requesterId) {
  const [rows] = await pool.query(
    `
    select
      so.salesOrderId,
      so.customerId,
      so.status,
      so.totalAmount,
      so.orderDate,
      so.shippingAddress,
      so.isGreen,
      so.isGreenConfirmed,
      so.paymentMethodId,
      buyer.userName as buyerName,
      buyer.email as buyerEmail,
      buyer.avatar as buyerAvatar,
      buyer.phone as buyerPhone,
      buyer.address as buyerAddress,
      od.orderDetailId,
      od.quantity,
      od.unitPrice,
      p.productId,
      p.productName,
      p.imageURL,
      p.supplierId,
      seller.userName as sellerName,
      seller.email as sellerEmail,
      seller.avatar as sellerAvatar,
      seller.phone as sellerPhone,
      ledger.txHash,
      ledger.blockNumber,
      ledger.gasUsed,
      ledger.network,
      ledger.status as ledgerStatus,
      ledger.createdAt as ledgerCreatedAt,
      hc.callId as hsCallId,
      hc.status as hsStatus,
      hc.retries as hsRetries,
      hc.maxRetries as hsMaxRetries,
      hc.lastError as hsLastError,
      hc.nextRunAt as hsNextRunAt,
      hc.updatedAt as hsUpdatedAt
    from SalesOrder so
    join User buyer on buyer.userId = so.customerId
    join OrderDetail od on od.salesOrderId = so.salesOrderId
    join Product p on p.productId = od.productId
    join User seller on seller.userId = p.supplierId
    left join (
      select e.*
      from EscrowLedger e
      join (
        select salesOrderId, max(createdAt) as createdAt
        from EscrowLedger
        group by salesOrderId
      ) latestLedger on latestLedger.salesOrderId = e.salesOrderId and latestLedger.createdAt = e.createdAt
    ) ledger on ledger.salesOrderId = so.salesOrderId
    left join (
      select hc.*
      from HscoinContractCall hc
      join (
        select orderId, max(updatedAt) as latestUpdatedAt
        from HscoinContractCall
        where orderId is not null
        group by orderId
      ) latest on latest.orderId = hc.orderId and latest.latestUpdatedAt = hc.updatedAt
    ) hc on hc.orderId = so.salesOrderId
    where so.salesOrderId = ?
    `,
    [orderId]
  );

  if (rows.length === 0) {
    throw ApiError.notFound('Không tìm thấy đơn hàng');
  }

  const orderRow = rows[0];
  const baseItems = rows.map((row) => ({
    orderDetailId: row.orderDetailId,
    productId: row.productId,
    productName: row.productName,
    imageURL: row.imageURL,
    quantity: row.quantity,
    unitPrice: Number(row.unitPrice) || 0,
    supplierId: row.supplierId,
    supplier: {
      supplierId: row.supplierId,
      name: row.sellerName,
      email: row.sellerEmail,
      avatar: row.sellerAvatar,
      phone: row.sellerPhone,
    },
  }));

  const orderDetailIds = baseItems.map((item) => item.orderDetailId);
  const reviewByOrderDetail = new Map();
  if (orderDetailIds.length) {
    const [reviewRows] = await pool.query(
      `
      select r.reviewId, r.orderDetailId, r.starNumber, r.comment, r.createdAt
      from Review r
      where r.orderDetailId in (?)
      `,
      [orderDetailIds]
    );
    for (const review of reviewRows) {
      reviewByOrderDetail.set(review.orderDetailId, {
        reviewId: review.reviewId,
        rating: Number(review.starNumber) || 0,
        comment: review.comment || '',
        createdAt: review.createdAt instanceof Date ? review.createdAt.toISOString() : review.createdAt,
      });
    }
  }
  const items = baseItems.map((item) => ({
    ...item,
    review: reviewByOrderDetail.get(item.orderDetailId) || null,
  }));

  const sellerIds = Array.from(
    new Set(rows.map((row) => Number(row.supplierId)).filter((id) => Number.isFinite(id)))
  );

  const normalizedRequester = Number(requesterId);
  const isBuyer = Boolean(normalizedRequester) && normalizedRequester === Number(orderRow.customerId);
  const isSeller =
    Boolean(normalizedRequester) && sellerIds.some((sellerId) => sellerId === normalizedRequester);

  if (!isBuyer && !isSeller) {
    throw ApiError.forbidden('Bạn không có quyền xem đơn hàng này');
  }

  const escrow =
    orderRow.txHash && orderRow.blockNumber
      ? {
          txHash: orderRow.txHash,
          blockNumber: orderRow.blockNumber,
          gasUsed: orderRow.gasUsed,
          network: orderRow.network,
          status: orderRow.ledgerStatus,
          createdAt: orderRow.ledgerCreatedAt,
        }
      : await getEscrowSnapshot({
          orderId: orderRow.salesOrderId,
          status: orderRow.status,
          amount: orderRow.totalAmount,
        });

  const [ledgerHistory] = await pool.query(
    `
    select txHash, blockNumber, gasUsed, network, status, createdAt
    from EscrowLedger
    where salesOrderId = ?
    order by createdAt desc
    `,
    [orderId]
  );

  return {
    orderId: orderRow.salesOrderId,
    status: orderRow.status,
    isGreen: toBool(orderRow.isGreen),
    isGreenConfirmed: toBool(orderRow.isGreenConfirmed),
    totalAmount: Number(orderRow.totalAmount) || 0,
    orderDate: orderRow.orderDate instanceof Date ? orderRow.orderDate.toISOString() : orderRow.orderDate,
    shippingAddress: orderRow.shippingAddress,
    paymentMethodId: orderRow.paymentMethodId,
    customer: {
      userId: orderRow.customerId,
      name: orderRow.buyerName,
      email: orderRow.buyerEmail,
      avatar: orderRow.buyerAvatar,
      phone: orderRow.buyerPhone,
      address: orderRow.buyerAddress,
    },
    seller: items[0]?.supplier
      ? {
          supplierId: items[0].supplier.supplierId,
          name: items[0].supplier.name,
          email: items[0].supplier.email,
          avatar: items[0].supplier.avatar,
          phone: items[0].supplier.phone,
        }
      : null,
    items: items.map(({ supplier, ...rest }) => rest),
    escrow,
    ledgerHistory: ledgerHistory.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt,
    })),
    hscoinCall: orderRow.hsCallId
      ? {
          callId: orderRow.hsCallId,
          status: orderRow.hsStatus,
          retries: orderRow.hsRetries,
          maxRetries: orderRow.hsMaxRetries,
          lastError: orderRow.hsLastError,
          nextRunAt:
            orderRow.hsNextRunAt instanceof Date
              ? orderRow.hsNextRunAt.toISOString()
              : orderRow.hsNextRunAt,
          updatedAt:
            orderRow.hsUpdatedAt instanceof Date
              ? orderRow.hsUpdatedAt.toISOString()
              : orderRow.hsUpdatedAt,
        }
      : null,
    meta: {
      role: {
        isBuyer,
        isSeller,
      },
      actions: buildOrderActions({ status: orderRow.status, isBuyer, isSeller }),
    },
  };
}

export async function listOrdersForCustomer(customerId) {
  const [rows] = await pool.query(
    `
    select
      so.salesOrderId,
      so.status,
      so.totalAmount,
      so.orderDate,
      so.shippingAddress,
      so.isGreen,
      so.isGreenConfirmed,
      od.orderDetailId,
      od.quantity,
      od.unitPrice,
      p.productId,
      p.productName,
      p.imageURL,
      s.supplierId,
      u.userName as sellerName,
      u.avatar as sellerAvatar,
      ledger.txHash,
      ledger.blockNumber,
      ledger.gasUsed,
      ledger.network,
      ledger.status as ledgerStatus,
      ledger.createdAt as ledgerCreatedAt,
      hc.callId as hsCallId,
      hc.status as hsStatus,
      hc.retries as hsRetries,
      hc.maxRetries as hsMaxRetries,
      hc.lastError as hsLastError,
      hc.nextRunAt as hsNextRunAt,
      hc.updatedAt as hsUpdatedAt
    from SalesOrder so
    join OrderDetail od on od.salesOrderId = so.salesOrderId
    join Product p on p.productId = od.productId
    join Supplier s on p.supplierId = s.supplierId
    join User u on s.supplierId = u.userId
    left join (
      select e.*
      from EscrowLedger e
      join (
        select salesOrderId, max(createdAt) as createdAt
        from EscrowLedger
        group by salesOrderId
      ) latest on latest.salesOrderId = e.salesOrderId and latest.createdAt = e.createdAt
    ) ledger on ledger.salesOrderId = so.salesOrderId
    left join (
      select hc.*
      from HscoinContractCall hc
      join (
        select orderId, max(updatedAt) as latestUpdatedAt
        from HscoinContractCall
        where orderId is not null
        group by orderId
      ) latest on latest.orderId = hc.orderId and latest.latestUpdatedAt = hc.updatedAt
    ) hc on hc.orderId = so.salesOrderId
    where so.customerId = ?
    order by so.orderDate desc, so.salesOrderId desc
    `,
    [customerId]
  );

  const map = new Map();

  for (const row of rows) {
    if (!map.has(row.salesOrderId)) {
      map.set(row.salesOrderId, {
        orderId: row.salesOrderId,
        status: row.status,
        totalAmount: Number(row.totalAmount) || 0,
        orderDate: row.orderDate,
        isGreen: toBool(row.isGreen),
        isGreenConfirmed: toBool(row.isGreenConfirmed),
        shippingAddress: row.shippingAddress,
        seller: {
          supplierId: row.supplierId,
          name: row.sellerName,
          avatar: row.sellerAvatar,
        },
        items: [],
        ledger: row.txHash
          ? {
              txHash: row.txHash,
              blockNumber: row.blockNumber,
              gasUsed: row.gasUsed,
              network: row.network,
              status: row.ledgerStatus,
              createdAt: row.ledgerCreatedAt,
            }
          : null,
        hscoinCall: row.hsCallId
          ? {
              callId: row.hsCallId,
              status: row.hsStatus,
              retries: row.hsRetries,
              maxRetries: row.hsMaxRetries,
              lastError: row.hsLastError,
              nextRunAt: row.hsNextRunAt,
              updatedAt: row.hsUpdatedAt,
            }
          : null,
      });
    }

    const order = map.get(row.salesOrderId);
    order.items.push({
      orderDetailId: row.orderDetailId,
      productId: row.productId,
      productName: row.productName,
      imageURL: row.imageURL,
      quantity: row.quantity,
      unitPrice: Number(row.unitPrice) || 0,
    });
  }

  const orders = Array.from(map.values());
  return Promise.all(
    orders.map(async (order) => ({
      ...order,
      orderDate: order.orderDate instanceof Date ? order.orderDate.toISOString() : order.orderDate,
      escrow:
        order.ledger ||
        (await getEscrowSnapshot({
          orderId: order.orderId,
          status: order.status,
          amount: order.totalAmount,
        })),
      hscoinCall: order.hscoinCall
        ? {
            ...order.hscoinCall,
            updatedAt:
              order.hscoinCall.updatedAt instanceof Date
                ? order.hscoinCall.updatedAt.toISOString()
                : order.hscoinCall.updatedAt,
            nextRunAt:
              order.hscoinCall.nextRunAt instanceof Date
                ? order.hscoinCall.nextRunAt.toISOString()
                : order.hscoinCall.nextRunAt,
          }
        : null,
    }))
  );
}

export async function listOrdersForSeller(supplierId) {
  const normalizedSupplier = Number(supplierId);
  if (!normalizedSupplier) {
    return [];
  }

  const [rows] = await pool.query(
    `
    select
      so.salesOrderId,
      so.status,
      so.totalAmount,
      so.orderDate,
      so.shippingAddress,
      so.isGreen,
      so.isGreenConfirmed,
      od.orderDetailId,
      od.quantity,
      od.unitPrice,
      p.productId,
      p.productName,
      p.imageURL,
      so.customerId,
      buyer.userName as buyerName,
      buyer.avatar as buyerAvatar,
      buyer.email as buyerEmail,
      ledger.txHash,
      ledger.blockNumber,
      ledger.gasUsed,
      ledger.network,
      ledger.status as ledgerStatus,
      ledger.createdAt as ledgerCreatedAt,
      hc.callId as hsCallId,
      hc.status as hsStatus,
      hc.retries as hsRetries,
      hc.maxRetries as hsMaxRetries,
      hc.lastError as hsLastError,
      hc.nextRunAt as hsNextRunAt,
      hc.updatedAt as hsUpdatedAt
    from SalesOrder so
    join OrderDetail od on od.salesOrderId = so.salesOrderId
    join Product p on p.productId = od.productId
    join User buyer on buyer.userId = so.customerId
    left join (
      select e.*
      from EscrowLedger e
      join (
        select salesOrderId, max(createdAt) as createdAt
        from EscrowLedger
        group by salesOrderId
      ) latestLedger on latestLedger.salesOrderId = e.salesOrderId and latestLedger.createdAt = e.createdAt
    ) ledger on ledger.salesOrderId = so.salesOrderId
    left join (
      select hc.*
      from HscoinContractCall hc
      join (
        select orderId, max(updatedAt) as latestUpdatedAt
        from HscoinContractCall
        where orderId is not null
        group by orderId
      ) latest on latest.orderId = hc.orderId and latest.latestUpdatedAt = hc.updatedAt
    ) hc on hc.orderId = so.salesOrderId
    where p.supplierId = ?
    order by so.orderDate desc, so.salesOrderId desc
    `,
    [normalizedSupplier]
  );

  const map = new Map();

  for (const row of rows) {
    if (!map.has(row.salesOrderId)) {
      map.set(row.salesOrderId, {
        orderId: row.salesOrderId,
        status: row.status,
        totalAmount: Number(row.totalAmount) || 0,
        orderDate: row.orderDate,
        isGreen: toBool(row.isGreen),
        isGreenConfirmed: toBool(row.isGreenConfirmed),
        shippingAddress: row.shippingAddress,
        customer: {
          userId: row.customerId,
          name: row.buyerName,
          avatar: row.buyerAvatar,
          email: row.buyerEmail,
        },
        items: [],
        ledger: row.txHash
          ? {
              txHash: row.txHash,
              blockNumber: row.blockNumber,
              gasUsed: row.gasUsed,
              network: row.network,
              status: row.ledgerStatus,
              createdAt: row.ledgerCreatedAt,
            }
          : null,
        hscoinCall: row.hsCallId
          ? {
              callId: row.hsCallId,
              status: row.hsStatus,
              retries: row.hsRetries,
              maxRetries: row.hsMaxRetries,
              lastError: row.hsLastError,
              nextRunAt: row.hsNextRunAt,
              updatedAt: row.hsUpdatedAt,
            }
          : null,
      });
    }

    const order = map.get(row.salesOrderId);
    order.items.push({
      orderDetailId: row.orderDetailId,
      productId: row.productId,
      productName: row.productName,
      imageURL: row.imageURL,
      quantity: row.quantity,
      unitPrice: Number(row.unitPrice) || 0,
    });
  }

  const orders = Array.from(map.values());
  return Promise.all(
    orders.map(async (order) => ({
      ...order,
      orderDate: order.orderDate instanceof Date ? order.orderDate.toISOString() : order.orderDate,
      escrow:
        order.ledger ||
        (await getEscrowSnapshot({
          orderId: order.orderId,
          status: order.status,
          amount: order.totalAmount,
        })),
      hscoinCall: order.hscoinCall
        ? {
            ...order.hscoinCall,
            updatedAt:
              order.hscoinCall.updatedAt instanceof Date
                ? order.hscoinCall.updatedAt.toISOString()
                : order.hscoinCall.updatedAt,
            nextRunAt:
              order.hscoinCall.nextRunAt instanceof Date
                ? order.hscoinCall.nextRunAt.toISOString()
                : order.hscoinCall.nextRunAt,
          }
        : null,
    }))
  );
}

export async function listEscrowEventsForUser(customerId) {
  const [rows] = await pool.query(
    `
    select
      el.*,
      so.totalAmount,
      so.orderDate,
      so.status as orderStatus
    from EscrowLedger el
    join SalesOrder so on so.salesOrderId = el.salesOrderId
    where so.customerId = ?
    order by el.createdAt desc
    limit 10
    `,
    [customerId]
  );

  return rows.map((row) => ({
    orderId: row.salesOrderId,
    status: row.orderStatus,
    totalAmount: Number(row.totalAmount) || 0,
    orderDate: row.orderDate instanceof Date ? row.orderDate.toISOString() : row.orderDate,
    escrow: {
      txHash: row.txHash,
      blockNumber: row.blockNumber,
      gasUsed: row.gasUsed,
      network: row.network,
      status: row.status,
      timestamp: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    },
  }));
}
