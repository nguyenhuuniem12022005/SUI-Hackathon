import { Router } from "express";
import * as productController from '../app/controllers/productController.js';
import requireAuthentication from "../app/middleware/common/require-authentication.js";
import validate from "../app/middleware/common/validate.js";
import * as productRequest from '../app/requests/productRequest.js';
import checkProductIdExists from "../app/middleware/productMiddleware.js";
import { upload } from "../app/middleware/uploadMiddleware.js";

const productRouter = Router();

// Route công khai - không yêu cầu xác thực
productRouter.get(
    '/',
    validate(productRequest.searchProducts),
    productController.searchProducts
);

productRouter.get(
    '/:id(\\d+)',
    productController.getProductById
);

productRouter.get(
    '/:id(\\d+)/reviews',
    productController.listProductReviews
);

// Các route cần lại yêu cầu xác thực
productRouter.use(requireAuthentication);

productRouter.get(
    '/my',
    productController.listMyProducts
);

productRouter.get(
    '/:id/manage',
    checkProductIdExists,
    productController.getProductManagementDetail
);

productRouter.get(
    '/audits/pending',
    productController.listPendingAudits
);

productRouter.get(
    '/:id/audits',
    checkProductIdExists,
    productController.getProductAudits
);

productRouter.post(
    '/:id/audits',
    checkProductIdExists,
    validate(productRequest.requestProductAudit),
    productController.requestProductAudit
);

productRouter.post(
    '/new-product',
    upload.single('image'),
    validate(productRequest.createProduct),
    productController.createProduct
);

productRouter.post(
    '/:id/reviews',
    checkProductIdExists,
    validate(productRequest.createProductReview),
    productController.createProductReview
);

productRouter.post(
    '/reviews/:reviewId/flag',
    validate(productRequest.flagReview),
    productController.flagReview
);

productRouter.get(
    '/admin/review-flags',
    productController.listReviewFlags
);

productRouter.put(
    '/:id/update-product',
    checkProductIdExists,
    upload.single('image'),
    validate(productRequest.updateProduct),
    productController.updateProduct
);

productRouter.patch(
    '/:id/update-product-status',
    checkProductIdExists,
    validate(productRequest.updateProductStatus),
    productController.updateProductStatus
);

productRouter.patch(
    '/:id/audits/:auditId',
    checkProductIdExists,
    validate(productRequest.reviewProductAudit),
    productController.reviewProductAudit
);

productRouter.delete(
    '/:id/delete-product',
    checkProductIdExists,
    productController.deleteProduct
);

export default productRouter;

