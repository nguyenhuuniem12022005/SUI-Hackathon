'use client';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import ReviewCard from '../../../components/product/ReviewCard';
import { fetchMyReviews, fetchMonthlyLeaderboard } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMyReviews();
        setReviews(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error(err.message || 'Không tải được danh sách đánh giá');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMonthlyLeaderboard();
        setLeaderboard(Array.isArray(data) ? data : []);
      } catch (err) {
        // ignore error leaderboard
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Đánh giá của bạn</h1>

      {loading ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            Đang tải đánh giá...
          </CardContent>
        </Card>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            Bạn chưa viết đánh giá nào.
          </CardContent>
        </Card>
      ) : (
        reviews.map((review) => (
          <Card key={review.reviewId}>
             <CardHeader className="text-sm text-gray-600 border-b pb-2 pt-3 px-4">
                Đánh giá cho sản phẩm: <strong>{review.product?.title || 'Sản phẩm'}</strong>
             </CardHeader>
             <ReviewCard review={review} />
          </Card>
        ))
      )}

      <div className="space-y-3">
        <h2 className="text-xl font-bold">Bảng xếp hạng uy tín (30 ngày gần nhất)</h2>
        <Card>
          <CardContent className="p-4">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có dữ liệu.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead>
                    <tr className="text-gray-600 border-b">
                      <th className="py-2 pr-4">#</th>
                      <th className="py-2 pr-4">Người dùng</th>
                      <th className="py-2 pr-4">Uy tín +</th>
                      <th className="py-2 pr-4">Green Credit +</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((item, idx) => (
                      <tr key={item.userId} className="border-b last:border-0">
                        <td className="py-2 pr-4">{idx + 1}</td>
                        <td className="py-2 pr-4">
                          {item.userName || `User #${item.userId}`}
                        </td>
                        <td className="py-2 pr-4 text-emerald-700 font-semibold">
                          +{Number(item.repGain || 0)}
                        </td>
                        <td className="py-2 pr-4 text-green-700 font-semibold">
                          +{Number(item.greenGain || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
