import pool from '../../configs/mysql.js';
import ApiError from '../../utils/classes/api-error.js';

const CART_SELECT_FIELDS = `
    select 
        c.cartId,
        c.customerId,
        c.productId,
        c.quantity,
        p.productName,
        p.description,
        p.unitPrice,
        p.discount,
        p.status,
        p.imageURL,
        p.categoryId,
        p.supplierId,
        coalesce(inv.totalQuantity, 0) as totalQuantity
    from Cart c
    join Product p on p.productId = c.productId
    left join (
        select productId, sum(quantity) as totalQuantity
        from Store
        group by productId
    ) inv on inv.productId = p.productId
    where c.customerId = ?
    order by c.cartId desc
`;

export async function getCartItems(customerId) {
    const [rows] = await pool.query(CART_SELECT_FIELDS, [customerId]);
    return rows;
}

async function ensureProductAvailable(productId) {
    const [products] = await pool.query(
        `
        select productId
        from Product
        where productId = ? and status = 'Active'
        `,
        [productId]
    );

    if (products.length === 0) {
        throw ApiError.notFound('Sản phẩm không tồn tại hoặc đã ngừng bán');
    }
}

export async function addItem(customerId, productId, quantity = 1) {
    if (!productId) {
        throw ApiError.badRequest('Thiếu productId');
    }
    await ensureProductAvailable(productId);

    const qty = Math.max(1, Number(quantity) || 1);
    await pool.query(
        `
        insert into Cart (customerId, productId, quantity)
        values (?, ?, ?)
        on duplicate key update quantity = Cart.quantity + values(quantity)
        `,
        [customerId, productId, qty]
    );

    return getCartItems(customerId);
}

export async function updateItem(customerId, productId, quantity) {
    if (!productId) {
        throw ApiError.badRequest('Thiếu productId');
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const [result] = await pool.query(
        `
        update Cart
        set quantity = ?
        where customerId = ? and productId = ?
        `,
        [qty, customerId, productId]
    );

    if (result.affectedRows === 0) {
        throw ApiError.notFound('Không tìm thấy sản phẩm trong giỏ hàng');
    }

    return getCartItems(customerId);
}

export async function removeItem(customerId, productId) {
    if (!productId) {
        throw ApiError.badRequest('Thiếu productId');
    }

    await pool.query(
        `
        delete from Cart
        where customerId = ? and productId = ?
        `,
        [customerId, productId]
    );

    return getCartItems(customerId);
}

export async function clearCart(customerId) {
    await pool.query(
        `
        delete from Cart
        where customerId = ?
        `,
        [customerId]
    );
}
