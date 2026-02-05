import dynamic from "next/dynamic";
import { Suspense } from "react";
import { getAllProducts, fetchCategories } from "../../lib/api";
import ProductCard from "../../components/product/ProductCard";
import HeroBanner from "../../components/layout/HeroBanner";
import UserFlowShowcase from "../../components/layout/UserFlowShowcase";
import BlockchainValueProps from "../../components/layout/BlockchainValueProps";
import Link from "next/link";
import SkeletonCard from "../../components/ui/SkeletonCard";

export const revalidate = 0;
const ChatWidget = dynamic(() => import("../../components/chat/ChatWidget"), { ssr: false });

async function CategoryGrid() {
  let categories = [];
  try {
    const result = await fetchCategories();
    categories = result?.categories || [];
  } catch (err) {
    console.error("fetchCategories error:", err?.message || err);
    categories = [];
  }

  if (categories.length === 0) {
    return (
      <div className="w-full bg-white mb-4 p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Khám phá danh mục</h2>
        <p className="text-sm text-gray-500">Chưa có danh mục nào.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white mb-4 p-4 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Khám phá danh mục</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {categories.map((category) => (
          <Link
            key={category.categoryId}
            href={`/category/${category.slug || category.categoryId}`}
            className="flex flex-col items-center text-center"
          >
            <div className="h-16 w-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center mb-2">
              <span className="text-xs font-semibold text-primary text-center px-2">
                {category.categoryName}
              </span>
            </div>
            <span className="text-xs font-medium text-gray-700">{category.categoryName}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CategoryGridSkeleton() {
  return (
    <div className="w-full bg-white mb-4 p-4 rounded-lg shadow-sm animate-pulse">
      <h2 className="text-lg font-semibold mb-3">Khám phá danh mục</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-gray-200 mb-2" />
            <div className="h-3 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function ProductGrid() {
  let products = [];
  try {
    products = await getAllProducts(20);
  } catch (err) {
    console.error("getAllProducts error:", err?.message || err);
    products = [];
  }

  if (products.length === 0) {
    return (
      <p className="text-gray-500 col-span-full text-center py-4">Không có sản phẩm nào.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {products.map((product) => (
        <ProductCard key={product.productId} product={product} />
      ))}
    </div>
  );
}

function ProductGridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      <HeroBanner />

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<CategoryGridSkeleton />}>
          <CategoryGrid />
        </Suspense>

        <UserFlowShowcase />

        <BlockchainValueProps />

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Sản phẩm mới đăng</h2>
          <Suspense fallback={<ProductGridSkeleton count={12} />}>
            <ProductGrid />
          </Suspense>
        </div>
      </div>

      {ChatWidget && <ChatWidget />}
    </div>
  );
}

