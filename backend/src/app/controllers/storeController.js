import * as storeService from '../services/storeService.js';
import * as productService from '../services/productService.js';

export async function createStore(req, res) {
    const { productId, warehouseId, quantity } = req.body;

    const store = await storeService.createStore({
        productId: Number(productId),
        warehouseId: Number(warehouseId),
        quantity: Number(quantity)
    });

    await productService.activateProduct(Number(productId));

    res.json({ 
        success: true, 
        message: 'Thêm sản phẩm vào kho thành công!',
        store: store
    });
}

export async function setQuantity(req, res) {
    const { productId, warehouseId, quantity } = req.body;

    await storeService.setQuantity(productId, warehouseId, quantity);

    res.json({ 
        success: true, 
        message: 'Cập nhật số lượng (ghi đè) thành công!' 
    });
}

export async function updateQuantity(req, res) {
    const { productId, warehouseId, amount } = req.body;

    await storeService.updateQuantity(productId, warehouseId, amount);

    res.json({ 
        success: true, 
        message: 'Điều chỉnh số lượng thành công!' 
    });
}

export async function deleteStore(req, res) {
    const { productId, warehouseId } = req.body;

    await storeService.deleteStore(productId, warehouseId);

    res.json({ 
        success: true, 
        message: 'Xóa sản phẩm khỏi kho thành công!' 
    });
}
