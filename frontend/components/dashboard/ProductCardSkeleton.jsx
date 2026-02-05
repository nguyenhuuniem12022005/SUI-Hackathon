'use client';

import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export default function ProductCardSkeleton({ count = 1 }) {
  return Array.from({ length: count }).map((_, idx) => (
    <div key={idx} className="rounded-lg border border-gray-100 bg-white shadow-sm">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <Skeleton width={180} height={20} />
        <Skeleton width={80} height={24} />
      </div>
      <div className="p-4 flex flex-col md:flex-row gap-4">
        <Skeleton width={96} height={96} />
        <div className="flex-1 space-y-3">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={16} />
          <Skeleton width="50%" height={16} />
          <Skeleton width="30%" height={16} />
        </div>
        <div className="w-full md:w-40 space-y-2">
          <Skeleton height={36} />
          <Skeleton height={36} />
        </div>
      </div>
    </div>
  ));
}
