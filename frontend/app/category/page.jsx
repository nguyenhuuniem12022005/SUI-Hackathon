import Link from 'next/link';

const categories = [
  { id: 1, name: 'Sách vở', slug: 'sach-vo' },
  { id: 2, name: 'Đồ điện tử', slug: 'do-dien-tu' },
  { id: 3, name: 'Thời trang', slug: 'thoi-trang' },
  { id: 4, name: 'Khóa học', slug: 'khoa-hoc' },
];

export const metadata = {
  title: 'Danh mục sản phẩm | P-Market',
};

export default function CategoryPage() {
  return (
    <main className="px-4 py-8 max-w-5xl mx-auto space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-emerald-600 font-semibold uppercase">Danh m?c</p>
        <h1 className="text-3xl font-bold">Kh�m ph� c�c nh�m s?n ph?m</h1>
        <p className="text-gray-600">Ch?n danh m?c b?n quan t�m �? xem danh s�ch s?n ph?m t��ng ?ng.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => (
          <article key={category.id} className="border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-xl font-semibold">{category.name}</h2>
            <p className="text-sm text-gray-500 mt-1">H�ng ch�nh h?ng, c?p nh?t li�n t?c.</p>
            <Link
              href={`/category/${category.slug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary mt-4"
            >
              Xem s?n ph?m
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
