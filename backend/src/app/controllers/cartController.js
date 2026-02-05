import * as cartService from '../services/cartService.js';

export async function getCart(req, res) {
    const customerId = req.user.userId;
    const items = await cartService.getCartItems(customerId);

    res.json({
        success: true,
        items
    });
}

export async function addItem(req, res) {
    const customerId = req.user.userId;
    const { productId, quantity = 1 } = req.body;

    const items = await cartService.addItem(customerId, Number(productId), quantity);
    res.status(201).json({
        success: true,
        message: 'Đã thêm sản phẩm vào giỏ hàng',
        items
    });
}

export async function updateItem(req, res) {
    const customerId = req.user.userId;
    const productId = Number(req.params.productId);
    const { quantity } = req.body;

    const items = await cartService.updateItem(customerId, productId, quantity);
    res.json({
        success: true,
        message: 'Đã cập nhật số lượng',
        items
    });
}

export async function removeItem(req, res) {
    const customerId = req.user.userId;
    const productId = Number(req.params.productId);

    const items = await cartService.removeItem(customerId, productId);
    res.json({
        success: true,
        message: 'Đã xóa sản phẩm khỏi giỏ hàng',
        items
    });
}

export async function clearCart(req, res) {
    const customerId = req.user.userId;
    await cartService.clearCart(customerId);

    res.json({
        success: true,
        message: 'Đã làm trống giỏ hàng'
    });
}
