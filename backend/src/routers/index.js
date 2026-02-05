import authRouter from './authRouter.js';
import userRouter from './userRouter.js';
import productRouter from './productRouter.js';
import categoryRouter from './categoryRouter.js';
import customerRouter from './customerRouter.js';
import supplierRouter from './supplierRouter.js';
import storeRouter from './storeRouter.js';
import warehouseRouter from './warehouseRouter.js';
import overviewRouter from './overviewRouter.js';
import sellerReportRouter from './sellerReportRouter.js';
import chatRouter from './chatRouter.js';
import cartRouter from './cartRouter.js';
import blockchainRouter from './blockchainRouter.js';
import referralRouter from './referralRouter.js';
import orderRouter from './orderRouter.js';
import aiRouter from './aiRouter.js';

function route(app){
    app.use('/auth', authRouter);
    app.use('/users', userRouter);
    app.use('/products', productRouter);
    app.use('/categories', categoryRouter);
    app.use('/customers', customerRouter);
    app.use('/suppliers', supplierRouter);
    app.use('/stores', storeRouter);
    app.use('/warehouses', warehouseRouter);
    app.use('/reports', overviewRouter);
    app.use('/reports/seller', sellerReportRouter);
    app.use('/chatrooms', chatRouter);
    app.use('/cart', cartRouter);
    app.use('/blockchain', blockchainRouter);
    app.use('/referrals', referralRouter);
    app.use('/orders', orderRouter);
    app.use('/ai', aiRouter);
    
}

export default route;
