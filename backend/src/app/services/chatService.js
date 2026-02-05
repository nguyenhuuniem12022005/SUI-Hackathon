import pool from "../../configs/mysql.js";

export async function getProductById(productId) {
    const [rows] = await pool.query(
        `
        select 
            p.productId, 
            p.productName, 
            p.supplierId,
            s.shopName,
            u.userName,
            u.avatar
        from Product p
        join Supplier s on p.supplierId = s.supplierId
        join User u on s.supplierId = u.userId
        where p.productId = ?
        `,
        [productId]
    );
    return rows[0] || null;
}

export async function getOrCreateChatRoom(customerId, productId, productOverride = null) {
    const product = productOverride || await getProductById(productId);
    if (!product) {
        return { product: null, chatRoom: null };
    }

    const supplierId = product.supplierId;

    // Check if ChatRoom already exists
    const [existing] = await pool.query(
        `
        select *
        from ChatRoom
        where customerId = ? and supplierId = ?
        limit 1
        `,
        [customerId, supplierId]
    );

    if (existing.length > 0) {
        return { product, chatRoom: existing[0] };
    }

    // Use INSERT IGNORE to handle race conditions
    try {
        const [result] = await pool.query(
            `
            insert ignore into ChatRoom (customerId, supplierId, status)
            values (?, ?, 'Active')
            `,
            [customerId, supplierId]
        );

        // If insert was ignored (duplicate), fetch the existing one
        if (result.affectedRows === 0) {
            const [existingRoom] = await pool.query(
                `
                select *
                from ChatRoom
                where customerId = ? and supplierId = ?
                limit 1
                `,
                [customerId, supplierId]
            );
            return { product, chatRoom: existingRoom[0] };
        }

        const [rows] = await pool.query(
            `
            select *
            from ChatRoom
            where chatRoomId = ?
            `,
            [result.insertId]
        );

        return { product, chatRoom: rows[0] };
    } catch (error) {
        // If duplicate entry error, try to get existing room
        if (error.code === 'ER_DUP_ENTRY') {
            const [existingRoom] = await pool.query(
                `
                select *
                from ChatRoom
                where customerId = ? and supplierId = ?
                limit 1
                `,
                [customerId, supplierId]
            );
            if (existingRoom.length > 0) {
                return { product, chatRoom: existingRoom[0] };
            }
        }
        throw error;
    }
}

export async function getChatRoomById(chatRoomId) {
    const [rows] = await pool.query(
        `
        select cr.*, 
               cu.userName as customerName, cu.avatar as customerAvatar,
               su.userName as supplierName, su.avatar as supplierAvatar
        from ChatRoom cr
        join User cu on cr.customerId = cu.userId
        join User su on cr.supplierId = su.userId
        where chatRoomId = ?
        `,
        [chatRoomId]
    );
    return rows[0] || null;
}

export async function getMessagesByChatRoom(chatRoomId) {
    const [rows] = await pool.query(
        `
        select m.*, u.userName, u.avatar
        from Message m
        join User u on m.senderId = u.userId
        where m.chatRoomId = ?
        order by m.sentAt asc
        `,
        [chatRoomId]
    );
    return rows;
}

export async function createMessage(chatRoomId, senderId, content) {
    const trimmed = content.trim();
    const [result] = await pool.query(
        `
        insert into Message (chatRoomId, senderId, content)
        values (?, ?, ?)
        `,
        [chatRoomId, senderId, trimmed]
    );

    const [rows] = await pool.query(
        `
        select m.*, u.userName, u.avatar
        from Message m
        join User u on m.senderId = u.userId
        where m.messageId = ?
        `,
        [result.insertId]
    );

    return rows[0];
}

export async function getChatRoomsForUser(userId) {
    const [rows] = await pool.query(
        `
        select cr.*,
               cu.userName as customerName, cu.avatar as customerAvatar,
               su.userName as supplierName, su.avatar as supplierAvatar
        from ChatRoom cr
        join User cu on cr.customerId = cu.userId
        join User su on cr.supplierId = su.userId
        where (cr.customerId = ? and cr.supplierId <> ?)
           or (cr.supplierId = ? and cr.customerId <> ?)
        order by cr.chatRoomId desc
        `,
        [userId, userId, userId, userId]
    );

    return rows;
}
