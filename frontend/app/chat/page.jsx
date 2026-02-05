'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container } from '../../components/ui/Container';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  buildAvatarUrl,
  createChatRoomForProduct,
  fetchChatMessages,
  fetchChatRooms,
  sendChatMessage
} from '../../lib/api';

export default function ChatPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const productId = searchParams.get('product');
  const roomParam = searchParams.get('room');

  const [linkedProduct, setLinkedProduct] = useState(null);
  const [chatRoom, setChatRoom] = useState(null);
  const [chatRooms, setChatRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const counterpartInfo = useMemo(() => {
    if (!chatRoom || !user) return null;
    const isCustomer = chatRoom.customerId === user.userId;
    return isCustomer
      ? { name: chatRoom.supplierName, avatar: chatRoom.supplierAvatar, label: 'Người bán' }
      : { name: chatRoom.customerName, avatar: chatRoom.customerAvatar, label: 'Người mua' };
  }, [chatRoom, user]);

  const headerAvatar = buildAvatarUrl(counterpartInfo?.avatar || linkedProduct?.seller?.avatar);
  const headerName =
    counterpartInfo?.name ||
    linkedProduct?.seller?.userName ||
    linkedProduct?.seller?.shopName ||
    linkedProduct?.shopName ||
    'Đối tác';

  const loadMessages = useCallback(async (roomId) => {
    setIsLoadingChat(true);
    try {
      const response = await fetchChatMessages(roomId);
      setChatRoom(response.chatRoom);
      setMessages(response.messages || []);
      setLinkedProduct(null);
    } catch (error) {
      toast.error(error.message || 'Không tải được cuộc trò chuyện.');
    } finally {
      setIsLoadingChat(false);
    }
  }, []);

  const loadRooms = useCallback(async () => {
    if (!user) {
      setChatRooms([]);
      setIsLoadingRooms(false);
      return;
    }
    setIsLoadingRooms(true);
    try {
      const response = await fetchChatRooms();
      setChatRooms(response.chatRooms || []);
    } catch (error) {
      toast.error(error.message || 'Không tải được danh sách chat.');
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    let ignore = false;

    async function prepareChatByProduct() {
      if (!productId || !user) return;
      setIsLoadingChat(true);
      try {
        const response = await createChatRoomForProduct(Number(productId));
        if (ignore) return;
        setLinkedProduct(response.product);
        setChatRoom(response.chatRoom);
        const messageResponse = await fetchChatMessages(response.chatRoom.chatRoomId);
        if (!ignore) {
          setMessages(messageResponse.messages || []);
        }
        loadRooms();
      } catch (error) {
        if (!ignore) {
          toast.error(error.message || 'Không thể mở phòng chat.');
        }
      } finally {
        if (!ignore) setIsLoadingChat(false);
      }
    }

    if (productId && user) {
      prepareChatByProduct();
    }

    return () => {
      ignore = true;
    };
  }, [productId, loadRooms]);

  useEffect(() => {
    if (roomParam && user) {
      loadMessages(Number(roomParam));
    }
  }, [roomParam, loadMessages, user]);

  const handleSelectRoom = async (roomId) => {
    if (!user) return;
    await loadMessages(roomId);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatRoom?.chatRoomId) {
      toast.error('Chưa xác định phòng chat.');
      return;
    }
    if (newMessage.trim() === '' || isSending) return;

    setIsSending(true);
    try {
      const response = await sendChatMessage(chatRoom.chatRoomId, newMessage.trim());
      setMessages((prev) => [...prev, response.message]);
      setNewMessage('');
      loadRooms();
    } catch (error) {
      toast.error(error.message || 'Không gửi được tin nhắn.');
    } finally {
      setIsSending(false);
    }
  };

  if (!user) {
    return (
      <Container className="py-10">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6 text-center text-gray-700">
            Bạn cần đăng nhập để sử dụng tính năng chat.
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-6">
      <Card className="w-full max-w-5xl mx-auto shadow-lg">
        <CardHeader className="flex flex-col gap-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar src={headerAvatar} alt={headerName} />
            <div className="flex flex-col">
              <CardTitle className="text-xl">Trò chuyện với {headerName}</CardTitle>
              {counterpartInfo && (
                <span className="text-sm text-gray-500">{counterpartInfo.label}</span>
              )}
              {linkedProduct?.productName && (
                <span className="text-sm text-gray-500">
                  Sản phẩm: {linkedProduct.productName}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[560px]">
          {/* Sidebar rooms */}
          <div className="border rounded-md p-3 bg-gray-50 flex flex-col gap-2">
            <p className="text-sm font-semibold mb-1">Cuộc trò chuyện</p>
            {isLoadingRooms ? (
              <p className="text-xs text-gray-500">Đang tải danh sách...</p>
            ) : chatRooms.length === 0 ? (
              <p className="text-xs text-gray-500">Bạn chưa có cuộc trò chuyện nào.</p>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
                {chatRooms.map((room) => {
                  const isCustomer = room.customerId === user?.userId;
                  const counterpartName = isCustomer ? room.supplierName : room.customerName;
                  const isActive = chatRoom?.chatRoomId === room.chatRoomId;
                  return (
                    <button
                      key={room.chatRoomId}
                      type="button"
                      onClick={() => handleSelectRoom(room.chatRoomId)}
                      className={`w-full text-left px-3 py-2 rounded-md border ${
                        isActive ? 'bg-primary text-white border-primary' : 'border-gray-300 bg-white'
                      }`}
                    >
                      <div className="text-sm font-semibold truncate">
                        {counterpartName || `Chat #${room.chatRoomId}`}
                      </div>
                      <div className="text-[11px] text-gray-600">
                        {room.latestMessage || ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Conversation */}
          <div className="lg:col-span-2 border rounded-md flex flex-col bg-white">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
              <Avatar src={headerAvatar} alt={headerName} />
              <div>
                <p className="font-semibold">{headerName}</p>
                {counterpartInfo && (
                  <p className="text-xs text-gray-500">{counterpartInfo.label}</p>
                )}
              </div>
            </div>
            <div className="flex-1 p-4 h-[420px] overflow-y-auto space-y-3">
              {isLoadingChat ? (
                <div className="text-center text-gray-500">Đang tải hội thoại...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500">Chưa có tin nhắn nào.</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.messageId || msg.id}
                    className={`flex ${
                      msg.senderId === user?.userId ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`p-3 rounded-lg max-w-[80%] ${
                        msg.senderId === user?.userId
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-[10px] opacity-70 mt-1">
                        {msg.userName || (msg.senderId === user?.userId ? 'Bạn' : 'Đối tác')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t p-4">
              <form onSubmit={handleSendMessage} className="flex w-full gap-2">
                <Input
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-grow"
                  disabled={isSending || isLoadingChat}
                />
                <Button type="submit" size="sm" disabled={isSending || isLoadingChat}>
                  <Send size={18} />
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
