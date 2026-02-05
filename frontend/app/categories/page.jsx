'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchCategories } from '../../lib/api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetchCategories();
        if (!ignore) {
          setCategories(res?.categories || []);
          setPage(1);
        }
      } catch (err) {
        if (!ignore) setError(err?.message || 'Không tải được danh mục');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Danh mục</h1>
      {loading && <p className="text-sm text-gray-500">Đang tải danh mục...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && categories.length === 0 && (
        <p className="text-sm text-gray-500">Chưa có danh mục nào.</p>
      )}
      {!loading && !error && categories.length > 0 && (
        <p className="text-xs text-gray-500 mb-2">
          Hiển thị {Math.min(categories.length, pageSize)} / {categories.length} danh mục mỗi trang
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {categories
          .slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
          .map((c) => (
          <Link
            key={c.categoryId}
            href={`/category/${c.slug || c.categoryId}`}
            className="p-3 rounded-lg border bg-white hover:shadow-sm transition"
          >
            <p className="font-semibold text-sm">{c.categoryName}</p>
            {c.description && (
              <p className="text-xs text-gray-500 line-clamp-2 mt-1">{c.description}</p>
            )}
          </Link>
        ))}
      </div>
      {categories.length > pageSize && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            type="button"
            className="px-3 py-1 text-xs rounded border"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Trước
          </button>
          <span className="text-xs text-gray-600">
            Trang {page}/{Math.max(1, Math.ceil(categories.length / pageSize))}
          </span>
          <button
            type="button"
            className="px-3 py-1 text-xs rounded border"
            onClick={() =>
              setPage((p) => Math.min(Math.ceil(categories.length / pageSize), p + 1))
            }
            disabled={page >= Math.ceil(categories.length / pageSize)}
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}
