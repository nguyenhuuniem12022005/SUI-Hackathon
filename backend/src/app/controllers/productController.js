import * as productService from '../services/productService.js';

export async function createProduct(req, res) {
    const supplierId = req.user.userId;
    
    // Lấy đường dẫn file ảnh nếu có upload
    const imageURL = req.file ? `/uploads/${req.file.filename}` : null;
    
    const productData = {
        ...req.body,
        status: 'Active', // Auto-activate for SUI Web3 demo
        imageURL
    };

    const newProduct = await productService.createProduct(productData, supplierId);

    res.status(201).json({
        success: true,
        message: 'Tạo sản phẩm thành công!',
        product: newProduct
    });
}

export async function searchProducts(req, res) {
    const { searchTerm, categoryId } = req.query; 

    const products = await productService.searchProducts(
        searchTerm || '', 
        categoryId ? Number(categoryId) : null
    );
    res.status(200).json({
        success: true,
        message: 'Tìm kiếm thành công!',
        products: products
    });
}

export async function updateProduct(req, res, next) {
    try {
        const productId = req.params.id;
        const supplierId = req.user.userId;
        const imageURL = req.file ? `/uploads/${req.file.filename}` : undefined;

        const updatePayload = {
            ...req.body
        };

        if (imageURL !== undefined) {
            updatePayload.imageURL = imageURL;
        }

        await productService.updateProduct(productId, supplierId, updatePayload);

        res.status(200).json({
            success: true,
            message: 'Cập nhật sản phẩm thành công!'
        });
    } catch (error) {
        next(error);
    }
}

export async function updateProductStatus(req, res) {
    const productId = req.params.id;
    const supplierId = req.user.userId;

    await productService.updateProductStatus(productId, supplierId, req.body.status);

    res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái sản phẩm thành công!'
    });
}

export async function deleteProduct(req, res, next) {
    try {
        const productId = req.params.id;
        const supplierId = req.user.userId;

        await productService.deleteProduct(productId, supplierId);

        res.status(200).json({
            success: true,
            message: 'Xóa sản phẩm thành công!'
        });
    } catch (error) {
        next(error);
    }
}

export async function getProductById(req, res) {
    const productId = req.params.id;
    const product = await productService.getProductById(productId);
    
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy sản phẩm'
        });
    }
    
    res.status(200).json({
        success: true,
        product: product
    });
}

export async function requestProductAudit(req, res, next) {
    try {
        const productId = Number(req.params.id);
        const supplierId = req.user.userId;
        const audit = await productService.requestProductAudit(productId, supplierId, req.body);
        res.status(201).json({
            success: true,
            message: 'Đã gửi yêu cầu kiểm duyệt sản phẩm.',
            data: audit,
        });
    } catch (error) {
        next(error);
    }
}

export async function getProductAudits(req, res, next) {
    try {
        const productId = Number(req.params.id);
        const audits = await productService.getProductAudits(productId);
        res.status(200).json({
            success: true,
            data: audits,
        });
    } catch (error) {
        next(error);
    }
}

export async function reviewProductAudit(req, res, next) {
    try {
        const productId = Number(req.params.id);
        const auditId = Number(req.params.auditId);
        const reviewerId = req.user.userId;
        const audits = await productService.reviewProductAudit(productId, auditId, reviewerId, req.body);
        res.status(200).json({
            success: true,
            message: 'Đã cập nhật trạng thái kiểm duyệt.',
            data: audits,
        });
    } catch (error) {
        next(error);
    }
}

export async function listPendingAudits(req, res, next) {
    try {
        const audits = await productService.listPendingAudits();
        res.status(200).json({
            success: true,
            data: audits,
        });
    } catch (error) {
        next(error);
    }
}

export async function listMyProducts(req, res) {
    const supplierId = req.user.userId;
    const products = await productService.getProductsBySupplier(supplierId);

    res.status(200).json({
        success: true,
        message: 'Lấy danh sách sản phẩm của bạn thành công',
        products,
    });
}

export async function getProductManagementDetail(req, res, next) {
    try {
        const supplierId = req.user.userId;
        const productId = Number(req.params.id);
        const product = await productService.getProductForManagement(productId, supplierId);
        res.status(200).json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
}

export async function listProductReviews(req, res, next) {
    try {
        const productId = Number(req.params.id);
        const data = await productService.listProductReviews(productId);
        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        next(error);
    }
}

export async function createProductReview(req, res, next) {
    try {
        const productId = Number(req.params.id);
        const customerId = req.user.userId;
        const { orderDetailId, rating, comment } = req.body;
        const data = await productService.createProductReview(
            productId,
            Number(orderDetailId),
            customerId,
            { rating, comment }
        );
        res.status(201).json({
            success: true,
            message: 'Đã ghi nhận đánh giá của bạn.',
            data,
        });
    } catch (error) {
        next(error);
    }
}

export async function flagReview(req, res, next) {
    try {
        const reviewId = Number(req.params.reviewId);
        const reporterId = req.user.userId;
        const { reason } = req.body;
        const data = await productService.flagReview(reviewId, reporterId, reason);
        res.status(201).json({
            success: true,
            message: 'Đã gửi báo cáo review.',
            data,
        });
    } catch (error) {
        next(error);
    }
}

export async function listReviewFlags(req, res, next) {
    try {
        const data = await productService.listReviewFlags(req.query.limit);
        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        next(error);
    }
}
