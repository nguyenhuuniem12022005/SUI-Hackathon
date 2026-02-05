import * as chatService from '../services/chatService.js';
import ApiError from '../../utils/classes/api-error.js';

function ensureParticipant(chatRoom, userId) {
    if (!chatRoom) {
        throw ApiError.notFound('Chat room không tồn tại.');
    }
    if (chatRoom.customerId !== userId && chatRoom.supplierId !== userId) {
        throw ApiError.forbidden('Bạn không có quyền truy cập phòng chat này.');
    }
}

export async function getOrCreateChatRoom(req, res) {
    const customerId = req.user.userId;
    const { productId } = req.body;

    if (!productId) {
        throw ApiError.badRequest('productId là bắt buộc.');
    }
    const product = await chatService.getProductById(Number(productId));
    if (!product) {
        throw ApiError.notFound('Không tìm thấy sản phẩm để mở chat.');
    }
    if (product.supplierId === customerId) {
        throw ApiError.badRequest('Bạn không thể chat với chính sản phẩm của mình. Vui lòng đăng nhập bằng tài khoản khác.');
    }

    const { chatRoom } = await chatService.getOrCreateChatRoom(customerId, Number(productId), product);

    if (!product || !chatRoom) {
        throw ApiError.notFound('Không tìm thấy sản phẩm để mở chat.');
    }

    const productPayload = product
        ? {
            productId: product.productId,
            productName: product.productName,
            supplierId: product.supplierId,
            seller: {
                userName: product.userName,
                shopName: product.shopName,
                avatar: product.avatar
            }
        }
        : null;

    const enrichedChatRoom = await chatService.getChatRoomById(chatRoom.chatRoomId);

    res.json({
        success: true,
        chatRoom: enrichedChatRoom || chatRoom,
        product: productPayload
    });
}

export async function fetchMessages(req, res) {
    const userId = req.user.userId;
    const chatRoomId = Number(req.params.id);

    if (!chatRoomId) {
        throw ApiError.badRequest('chatRoomId không hợp lệ.');
    }

    const chatRoom = await chatService.getChatRoomById(chatRoomId);
    ensureParticipant(chatRoom, userId);

    const messages = await chatService.getMessagesByChatRoom(chatRoomId);

    res.json({
        success: true,
        chatRoom,
        messages
    });
}

export async function sendMessage(req, res) {
    const userId = req.user.userId;
    const chatRoomId = Number(req.params.id);
    const { content } = req.body;

    if (!chatRoomId) {
        throw ApiError.badRequest('chatRoomId không hợp lệ.');
    }

    if (!content || !content.trim()) {
        throw ApiError.badRequest('Nội dung tin nhắn không được để trống.');
    }

    const chatRoom = await chatService.getChatRoomById(chatRoomId);
    ensureParticipant(chatRoom, userId);

    const message = await chatService.createMessage(chatRoomId, userId, content);

    res.status(201).json({
        success: true,
        message
    });
}

export async function listChatRooms(req, res) {
    const userId = req.user.userId;
    const rooms = await chatService.getChatRoomsForUser(userId);

    res.json({
        success: true,
        chatRooms: rooms
    });
}
