import * as supplierService from '../services/supplierService.js';

export async function updateShopName(req, res) {
    const supplierId = req.user.userId;
    const { shopName } = req.body; 

    await supplierService.updateShopName(supplierId, shopName);

    res.status(200).json({
        success: true,
        shop_name: shopName, 
        message: 'Cập nhật tên cửa hàng thành công!'
    });
}

export async function updateSellerRating(req, res) {
    await supplierService.updateSellerRating(req.user.userId);

    res.status(200).json({
        success: true,
        message: 'Cập nhật rating thành công!'
    });
}