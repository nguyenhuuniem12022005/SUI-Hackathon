'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import ProductCard from '../../../components/product/ProductCard';
import { Card, CardContent } from '../../../components/ui/Card';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { searchProducts, fetchCategories, extractCategoryIdFromSlug } from '../../../lib/api';
import toast from 'react-hot-toast';

const legacyCategoryMap = {
  books: { id: 1, name: 'Sách vở' },
  reading: { id: 1, name: 'Sách vở' },
  clothing: { id: 2, name: 'Quần áo' },
  fashion: { id: 2, name: 'Quần áo' },
  housing: { id: 3, name: 'Phòng trọ' },
  rent: { id: 3, name: 'Phòng trọ' },
  electronics: { id: 4, name: 'Đồ điện tử' },
  gadgets: { id: 4, name: 'Đồ điện tử' },
  home: { id: 5, name: 'Đồ gia dụng' },
  lifestyle: { id: 5, name: 'Đồ gia dụng' },
  sports: { id: 6, name: 'Đồ thể thao' },
  fitness: { id: 6, name: 'Đồ thể thao' },
  courses: { id: 7, name: 'Khóa học' },
  education: { id: 7, name: 'Khóa học' },
};

export default function CategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const searchQuery = searchParams.get('q');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('Danh mục');

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        let result;

        if (searchQuery) {
          result = await searchProducts({ searchTerm: searchQuery });
          setCategoryName(`Kết quả tìm kiếm: "${searchQuery}"`);
        } else {
          const legacy = legacyCategoryMap[slug];
          let categoryId =
            extractCategoryIdFromSlug(slug) ??
            legacy?.id ??
            null;
          let resolvedName = legacy?.name || 'Danh mục';

          try {
            const categoryResponse = await fetchCategories();
            const categoryList = categoryResponse?.categories || [];
            const matched = categoryList.find(
              (category) =>
                category.slug === slug || category.categoryId === categoryId
            );
            if (matched) {
              categoryId = matched.categoryId;
              resolvedName = matched.categoryName || resolvedName;
            }
          } catch (categoryError) {
            console.warn('Không tải được danh mục:', categoryError.message);
          }

          result = await searchProducts(
            categoryId ? { categoryId } : {}
          );
          setCategoryName(resolvedName);
        }

        if (result && result.success) {
          setProducts(result.items || []);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Error loading products:', error);
        toast.error('Không thể tải sản phẩm!');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [slug, searchQuery]);

  if (loading) {
    return (
      <div className="py-8 px-4 flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">{categoryName}</h1>

        {products.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-gray-500">
              Hiện chưa có sản phẩm nào.
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Tìm thấy {products.length} sản phẩm
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.productId}
                  product={product}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
