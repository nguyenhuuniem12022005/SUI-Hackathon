import { Card, CardContent, CardHeader } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import Image from 'next/image';
import { Star, ThumbsDown } from 'lucide-react';

export default function ReviewCard({ review }) {
  const rating = Number(review.rating || review.starNumber || 0);
  const displayName = review.userName || review.author || 'Người dùng';
  const createdAt = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('vi-VN')
    : null;
  const media = Array.isArray(review.media) ? review.media : [];

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 pb-2">
        <Avatar src={review.avatar || '/avatar.png'} />
        <div>
          <h4 className="font-semibold">{displayName}</h4>
          {createdAt && <p className="text-xs text-gray-500">{createdAt}</p>}
          <div className="flex text-yellow-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} fill={i < rating ? 'currentColor' : 'none'} />
            ))}
          </div>
          {review.isVerified ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full mt-1">
              Verified purchase
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700">{review.comment || 'Người dùng không để lại nhận xét.'}</p>
        {review.isVerified === false && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
            <ThumbsDown size={16} />
            <p className="text-sm">
              <strong>Đã trừ điểm:</strong> {review.reason || 'Đánh giá không hợp lệ.'}
            </p>
          </div>
        )}
        {media.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {media.map((item) => (
              <a
                key={item.mediaId || item.url}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block relative w-full h-24"
              >
                <Image
                  src={item.url}
                  alt="Review media"
                  fill
                  className="object-cover rounded border"
                  sizes="200px"
                />
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
