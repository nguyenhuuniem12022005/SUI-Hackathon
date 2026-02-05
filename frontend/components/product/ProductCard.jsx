import Link from 'next/link';
import Image from 'next/image';
import { Card } from '../ui/Card';
import { resolveProductImage } from '../../lib/image';

const FALLBACK_IMAGE = 'https://placehold.co/600x400/eee/31343C?text=P-Market';

export default function ProductCard({ product }) {
  const productId = product.productId || product.id;
  const title = product.productName || product.title || 'Sản phẩm';
  const priceValue = product.unitPrice ?? product.price ?? 0;
  const quantity = product.totalQuantity ?? product.quantity ?? 0;
  const sellerName = product.userName || product.shopName || product.sellerName || 'Người bán';
  const sellerReputation = product.reputationScore;
  const sellerGreen = product.sellerGreenCredit;
  const isFree = Number(priceValue) === 0;
  const imageURL = resolveProductImage(product, FALLBACK_IMAGE);

  return (
    <Link href={`/products/${productId}`} className="block h-full">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg flex flex-col">
        <div className="relative w-full h-40 md:h-48">
          <Image
            src={imageURL}
            alt={title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            style={{ objectFit: 'cover' }}
          />
          {isFree && (
            <span className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
              CHO TẶNG
            </span>
          )}
        </div>
        <div className="p-2 md:p-4 flex flex-col flex-grow">
          <h3 className="text-sm md:text-base font-medium text-gray-800 line-clamp-2" title={title}>
            {title}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
            <span className="font-semibold text-gray-800">{sellerName}</span>
            {sellerReputation !== undefined && sellerReputation !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                ★ {sellerReputation}
              </span>
            )}
            {sellerGreen !== undefined && sellerGreen !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                GC {sellerGreen}
              </span>
            )}
          </div>

          <div className="flex-grow" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-base md:text-lg font-bold text-primary">
              {isFree ? 'Miễn phí' : `${Number(priceValue).toLocaleString('vi-VN')} ₫`}
            </span>
            <span className="text-xs text-gray-500">
              {quantity > 0 ? `Còn ${quantity}` : 'Đang cập nhật'}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
