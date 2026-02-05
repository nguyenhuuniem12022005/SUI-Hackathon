'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import Link from 'next/link';
import { BellRing, Tag, Gift, Truck, Loader2 } from 'lucide-react';
import { fetchNotifications, markNotificationsRead } from '../../lib/api';

const getIcon = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'promo':
      return <Tag className="text-orange-500" />;
    case 'order':
      return <Truck className="text-blue-500" />;
    case 'system':
    case 'hscoin':
      return <Gift className="text-green-500" />;
    default:
      return <BellRing className="text-gray-500" />;
  }
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchNotifications({ limit: 50 });
        setItems(
          (data || []).map((n) => ({
            id: n.notificationId || n.id,
            type: n.type || 'system',
            title: n.type === 'hscoin' ? 'HScoin' : 'Thông báo',
            text: n.content || '',
            time: n.createdAt,
            read: Boolean(n.isRead),
            link: n.relatedId ? `/orders/${n.relatedId}` : '#',
          }))
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleMarkAsRead = async (id) => {
    const target = items.find((n) => n.id === id);
    if (!target || target.read) return;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markNotificationsRead([id]).catch(() => {});
  };

  return (
    // Thêm div bao ngoài với padding
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      {/* Giới hạn chiều rộng nội dung */}
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Thông báo</h1>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500 flex items-center gap-2 justify-center">
              <Loader2 className="animate-spin" size={18} /> Đang tải thông báo...
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              Bạn chưa có thông báo nào.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((noti) => (
              <Card key={noti.id} className={`overflow-hidden ${!noti.read ? 'border-primary border-l-4' : 'border-gray-200'}`}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex-shrink-0 pt-1">
                    {getIcon(noti.type)}
                  </div>
                  <div className="flex-grow">
                    <h3 className={`font-semibold ${!noti.read ? 'text-gray-900' : 'text-gray-600'}`}>{noti.title}</h3>
                    <p className={`text-sm ${!noti.read ? 'text-gray-700' : 'text-gray-500'}`}>{noti.text}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {noti.time ? new Date(noti.time).toLocaleString('vi-VN') : ''}
                    </p>
                    <div className="mt-2 flex gap-2">
                       {noti.link && (
                         <Link href={noti.link}>
                            <Button variant="link" size="sm" className="p-0 h-auto text-primary">Xem chi tiết</Button>
                         </Link>
                       )}
                       {!noti.read && (
                          <Button variant="ghost" size="sm" className="p-0 h-auto text-gray-500" onClick={() => handleMarkAsRead(noti.id)}>
                             Đánh dấu đã đọc
                          </Button>
                       )}
                  </div>
                  </div>
                  {/* Chấm xanh nhỏ báo chưa đọc */}
                  {!noti.read && (
                     <div className="flex-shrink-0 w-2.5 h-2.5 bg-primary rounded-full mt-1.5"></div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
