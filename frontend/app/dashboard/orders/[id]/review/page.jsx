'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { Textarea } from '../../../../../components/ui/Textarea';
import { Select } from '../../../../../components/ui/Select';
import { fetchOrderDetail, createProductReview } from '../../../../../lib/api';
import { resolveProductImage } from '../../../../../lib/image';

const ratingOptions = [
  { value: 5, label: '⭐⭐⭐⭐⭐ Rất hài lòng' },
  { value: 4, label: '⭐⭐⭐⭐ Hài lòng' },
  { value: 3, label: '⭐⭐⭐ Bình thường' },
  { value: 2, label: '⭐⭐ Không hài lòng' },
  { value: 1, label: '⭐ Rất không hài lòng' },
];

export default function ReviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = params?.id;
  const selectedItemId = Number(searchParams?.get('itemId')) || null;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState(['']);

  useEffect(() => {
    let isMounted = true;
    async function loadOrder() {
      if (!orderId) return;
      setLoading(true);
      try {
        const data = await fetchOrderDetail(orderId);
        if (isMounted) {
          setOrder(data);
        }
      } catch (error) {
        toast.error(error.message || 'Không thể tải thông tin đơn hàng.');
        if (isMounted) setOrder(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadOrder();
    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const targetItem = useMemo(() => {
    if (!order?.items?.length) return null;
    if (selectedItemId) {
      return order.items.find((item) => item.orderDetailId === selectedItemId) || null;
    }
    return order.items.find((item) => !item.review) || null;
  }, [order, selectedItemId]);

  const isAlreadyReviewed = Boolean(targetItem?.review);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!targetItem || !orderId) return;
    const payload = {
      orderDetailId: targetItem.orderDetailId,
      rating,
      comment,
      attachments: attachmentUrls.filter(Boolean),
    };
    if (isAlreadyReviewed) {
      toast.success('Sản phẩm này đã có đánh giá.');
      router.push('/dashboard/orders');
      return;
    }
    setSubmitting(true);
    try {
      await createProductReview(targetItem.productId, payload);
      toast.success('Đã gửi đánh giá thành công!');
      router.push('/dashboard/orders');
    } catch (error) {
      toast.error(error.message || 'Không thể gửi đánh giá.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="py-10 text-center text-gray-600">Đang tải thông tin đơn hàng...</p>;
  }

  if (!order || !targetItem) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-gray-700">Không tìm thấy sản phẩm có thể đánh giá trong đơn hàng này.</p>
        <Button variant="secondary" onClick={() => router.push('/dashboard/orders')}>
          Quay lại đơn hàng
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Đánh giá sản phẩm</h1>
      <form onSubmit={handleSubmitReview} className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 border-b pb-4">
            <Image
              src={resolveProductImage(targetItem)}
              alt={targetItem.productName}
              width={60}
              height={60}
              className="rounded-md object-cover"
            />
            <div>
              <CardTitle className="text-lg">{targetItem.productName}</CardTitle>
              <p className="text-sm text-gray-500">Đơn #{order.orderId}</p>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {isAlreadyReviewed ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
                Bạn đã đánh giá sản phẩm này với {targetItem.review.rating}/5 ★ vào{' '}
                {targetItem.review.createdAt
                  ? new Date(targetItem.review.createdAt).toLocaleString('vi-VN')
                  : 'trước đó'}
                .
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="rating" className="block text-sm font-medium mb-1">
                    Mức độ hài lòng?
                  </label>
                  <Select
                    id="rating"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                  >
                    {ratingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
            <div>
              <label htmlFor="comment" className="block text-sm font-medium mb-1">
                Viết bình luận
              </label>
              <Textarea
                    id="comment"
                    placeholder="Chia sẻ cảm nhận sau khi sử dụng sản phẩm..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                rows={5}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ảnh minh họa (URL)</label>
              {attachmentUrls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) =>
                      setAttachmentUrls((prev) =>
                        prev.map((item, i) => (i === idx ? e.target.value : item))
                      )
                    }
                    className="flex-1 border rounded px-3 py-2 text-sm"
                    placeholder="https://example.com/image.jpg"
                  />
                  {attachmentUrls.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setAttachmentUrls((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      Xóa
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setAttachmentUrls((prev) => [...prev, ''])}
              >
                Thêm ảnh
              </Button>
              <p className="text-xs text-gray-500 mt-1">Tối đa 5 ảnh, dán URL công khai.</p>
            </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || isAlreadyReviewed}
            >
              {isAlreadyReviewed ? 'Đã đánh giá' : submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
