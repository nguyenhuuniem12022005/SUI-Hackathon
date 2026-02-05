import * as orderService from '../services/orderService.js';

export async function createEscrowOrder(req, res, next) {
  try {
    const payload = {
      customerId: req.user?.userId,
      productId: Number(req.body.productId),
      quantity: req.body.quantity,
      walletAddress: req.body.walletAddress,
      shippingAddress: req.body.shippingAddress,
      contractAddress: req.body.contractAddress,
    };
    const data = await orderService.createEscrowOrder(payload);
    return res.status(201).json({
      success: true,
      message:
        data.hscoinStatus === 'QUEUED'
          ? 'Đã tạo đơn hàng và xếp hàng burn HScoin. Hệ thống sẽ thử lại tự động.'
          : 'Đã tạo đơn hàng và burn HScoin thành công.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function markCompleted(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    const data = await orderService.markOrderCompleted(orderId, { triggerReferral: true });
    return res.status(200).json({
      success: true,
      message: 'Đơn hàng đã được đánh dấu hoàn tất và xử lý thưởng referral.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function markCancelled(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    const data = await orderService.markOrderCancelled(orderId);
    return res.status(200).json({
      success: true,
      message: 'Đơn hàng đã bị hủy.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getOrder(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    const data = await orderService.getOrderDetail(orderId, req.user?.userId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listMyOrders(req, res, next) {
  try {
    const data = await orderService.listOrdersForCustomer(req.user?.userId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listMySalesOrders(req, res, next) {
  try {
    const data = await orderService.listOrdersForSeller(req.user?.userId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listMyEscrowEvents(req, res, next) {
  try {
    const data = await orderService.listEscrowEventsForUser(req.user?.userId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function confirmAsBuyer(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    const data = await orderService.confirmOrderAsBuyer(orderId, req.user?.userId, {
      isGreenApproved: Boolean(req.body?.isGreenApproved),
    });
    const message = data.completed
      ? 'Đơn hàng đã được hoàn tất và giải phóng escrow.'
      : 'Đã ghi nhận xác nhận của bạn. Đang chờ phía người bán.';
    return res.status(200).json({
      success: true,
      message,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function confirmAsSeller(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    const data = await orderService.confirmOrderAsSeller(orderId, req.user?.userId);
    const message = data.completed
      ? 'Đơn hàng đã được xác nhận đầy đủ và escrow sẽ được giải phóng.'
      : 'Đã ghi nhận xác nhận của bạn. Đang chờ người mua.';
    return res.status(200).json({
      success: true,
      message,
      data,
    });
  } catch (error) {
    return next(error);
  }
}
