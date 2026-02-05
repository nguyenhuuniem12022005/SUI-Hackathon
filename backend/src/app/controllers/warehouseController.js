import * as warehouseService from '../services/warehouseService.js';

export async function createWarehouse(req, res) {
    const newWarehouse = await warehouseService.createWarehouse(req.body);
    
    res.status(201).json({
        success: true,
        message: 'Tạo kho hàng thành công!',
        warehouse: newWarehouse
    });
}

export async function updateWarehouse(req, res) {
    const warehouseId = req.params.id;
    
    await warehouseService.updateWarehouse(warehouseId, req.body);

    res.status(200).json({
        success: true,
        message: 'Cập nhật kho hàng thành công!'
    });
}

export async function deleteWarehouse(req, res) {
    const warehouseId = req.params.id; 
    
    await warehouseService.deleteWarehouse(warehouseId);

    res.status(200).json({
        success: true,
        message: 'Xóa kho hàng thành công!'
    });
}

export async function getWarehouses(req, res) {
    const warehouses = await warehouseService.getAllWarehouses();

    res.status(200).json({
        success: true,
        warehouses
    });
}
