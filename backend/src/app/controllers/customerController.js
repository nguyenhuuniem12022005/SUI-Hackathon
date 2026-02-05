import * as customerService from '../services/customerService.js';

export async function updateClass(req, res) {
    const customerId = req.user.userId;
    const { newClass } = req.body;

    await customerService.updateClass(customerId, newClass);
    res.json({
        success: true,
        message: 'Cập nhật lớp người dùng thành công!',
    });
}

export async function updateTotalPurchasedOrders(req, res) {
    const customerId = req.user.userId;
    const { amount } = req.body;

    await customerService.updateTotalPurchasedOrders(customerId, amount);
    res.json({
        success: true,
        message: 'Cập nhập số lượng hàng đã mua thành công!'
    });
}