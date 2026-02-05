'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  fetchChatRooms,
  fetchChatMessages,
  sendChatMessage,
  chatWithAI,
  buildAvatarUrl,
} from '../../lib/api';
import toast from 'react-hot-toast';

/**
 * ChatWidget tách riêng:
 * - Nút "Chat": popup chat người-mua / người-bán.
 * - Nút "Trợ lý AI": popup chỉ cho AI.
 */
export default function ChatWidget() {
  const { user } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

  // Human Chat State
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // AI Chat State
  const [aiMessages, setAiMessages] = useState([
    { id: 'welcome', role: 'ai', content: 'Xin chào! Tôi là trợ lý ảo P-Market. Tôi có thể giúp gì cho bạn hôm nay?' },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const loadRooms = useCallback(async () => {
    if (!user) return;
    setRoomsLoading(true);
    try {
      const response = await fetchChatRooms();
      setRooms(response?.chatRooms || []);
    } catch (error) {
      toast.error(error.message || 'Không tải được danh sách chat.');
    } finally {
      setRoomsLoading(false);
    }
  }, [user]);

  const loadMessages = useCallback(
    async (chatRoomId) => {
      setMessagesLoading(true);
      try {
        const response = await fetchChatMessages(chatRoomId);
        setSelectedRoom(response.chatRoom);
        setMessages(response.messages || []);
      } catch (error) {
        toast.error(error.message || 'Không tải được hội thoại.');
      } finally {
        setMessagesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isChatOpen) {
      loadRooms();
    }
  }, [isChatOpen, loadRooms]);

  const counterpartInfo = useMemo(() => {
    if (!selectedRoom || !user) return null;
    const isCustomer = selectedRoom.customerId === user.userId;
    return isCustomer
      ? { name: selectedRoom.supplierName, avatar: selectedRoom.supplierAvatar }
      : { name: selectedRoom.customerName, avatar: selectedRoom.customerAvatar };
  }, [selectedRoom, user]);

  const handleSelectRoom = async (room) => {
    await loadMessages(room.chatRoomId);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedRoom?.chatRoomId) {
      toast.error('Hãy chọn một cuộc trò chuyện.');
      return;
    }
    if (!newMessage.trim()) return;
    setIsSending(true);
    try {
      const response = await sendChatMessage(selectedRoom.chatRoomId, newMessage.trim());
      setMessages((prev) => [...prev, response.message]);
      setNewMessage('');
      loadRooms();
    } catch (error) {
      toast.error(error.message || 'Không gửi được tin nhắn.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAiMessage = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMsg = { id: Date.now(), role: 'user', content: aiInput.trim() };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setAiLoading(true);

    try {
      const data = await chatWithAI(userMsg.content);
      const aiMsg = { id: Date.now() + 1, role: 'ai', content: data.reply };
      setAiMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      toast.error('Không thể kết nối với AI.');
      setAiMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'ai', content: 'Xin lỗi, tôi đang gặp sự cố kết nối.' },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        className="fixed bottom-24 right-4 sm:bottom-20 sm:right-6 z-50 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full shadow-lg hover:bg-primary/90 transition"
        onClick={() => setIsChatOpen((prev) => !prev)}
      >
        <MessageCircle size={20} />
        Chat
      </button>

      <button
        type="button"
        className="fixed bottom-36 right-4 sm:bottom-32 sm:right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-emerald-700 transition"
        onClick={() => setIsAiOpen((prev) => !prev)}
      >
        <Bot size={18} />
        Trợ lý AI
      </button>

      {/* Popup Chat người dùng */}
      {isChatOpen && (
        <div className="fixed bottom-28 right-3 sm:bottom-24 sm:right-6 z-50 w-[360px] max-w-[calc(100%-24px)] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden h-[500px]">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-white">
            <div>
              <p className="text-sm font-semibold">Hỗ trợ & Tin nhắn</p>
            </div>
            <button
              type="button"
              onClick={() => setIsChatOpen(false)}
              className="p-1 rounded-full hover:bg-white/20 transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 border-b flex-1 overflow-hidden">
            <div className="border-r overflow-y-auto">
              {roomsLoading ? (
                <p className="text-xs text-gray-500 p-4">Đang tải...</p>
              ) : rooms.length === 0 ? (
                <p className="text-xs text-gray-500 p-4">Chưa có cuộc trò chuyện nào.</p>
              ) : (
                rooms.map((room) => {
                  const isCustomer = room.customerId === user.userId;
                  const counterpartName = isCustomer ? room.supplierName : room.customerName;
                  const isActive = selectedRoom?.chatRoomId === room.chatRoomId;
                  return (
                    <button
                      key={room.chatRoomId}
                      onClick={() => handleSelectRoom(room)}
                      className={`w-full text-left px-3 py-2 border-b text-sm ${
                        isActive ? 'bg-primary/10 font-semibold' : 'hover:bg-gray-50'
                      }`}
                    >
                      <p className="truncate">{counterpartName || `Chat #${room.chatRoomId}`}</p>
                      <p className="text-[11px] text-gray-500">
                        Vai trò: {isCustomer ? 'Người bán' : 'Người mua'}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex flex-col overflow-y-auto bg-gray-50/50">
              {messagesLoading ? (
                <p className="text-xs text-gray-500 p-4 text-center">Đang mở hội thoại...</p>
              ) : !selectedRoom ? (
                <p className="text-xs text-gray-500 p-4 text-center">Chọn một cuộc trò chuyện.</p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-gray-500 p-4 text-center">
                  Chưa có tin nhắn nào. Bắt đầu nhắn tin nhé!
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.messageId || msg.id}
                    className={`px-3 py-1 flex ${msg.senderId === user.userId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`rounded-lg px-3 py-2 text-xs max-w-[90%] break-words ${
                        msg.senderId === user.userId ? 'bg-primary text-white' : 'bg-gray-200'
                      }`}
                    >
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {selectedRoom && (
            <div className="px-4 py-2 border-t bg-white">
              <div className="flex items-center gap-2 mb-2 text-sm">
                <Avatar src={buildAvatarUrl(counterpartInfo?.avatar)} size="sm" />
                <div className="overflow-hidden">
                  <p className="font-semibold truncate">{counterpartInfo?.name || 'Đối tác'}</p>
                </div>
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  disabled={isSending}
                  className="h-9 text-sm"
                />
                <Button type="submit" size="icon" disabled={isSending} className="h-9 w-9">
                  <Send size={16} />
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Popup Trợ lý AI */}
      {isAiOpen && (
        <div className="fixed bottom-36 right-24 sm:bottom-32 sm:right-10 z-50 w-[340px] max-w-[calc(100%-32px)] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden h-[420px]">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-emerald-600 text-white">
            <div className="flex items-center gap-1">
              <Bot size={16} /> <p className="text-sm font-semibold">Trợ lý AI</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAiOpen(false)}
              className="p-1 rounded-full hover:bg-white/20 transition"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 p-3">
            {aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`px-3 py-2 rounded-lg text-sm max-w-[90%] ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {aiLoading && <p className="text-xs text-gray-500">Trợ lý đang soạn câu trả lời...</p>}
          </div>

          <form onSubmit={handleSendAiMessage} className="p-3 border-t flex items-center gap-2">
            <Input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Hỏi về sản phẩm xanh..."
              disabled={aiLoading}
              className="h-10"
            />
            <Button type="submit" size="icon" disabled={aiLoading} className="h-10 w-10">
              <Send size={18} />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
