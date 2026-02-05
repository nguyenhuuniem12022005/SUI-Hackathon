import { Router } from 'express';
import pool from '../configs/mysql.js';

const categoryRouter = Router();

const DEFAULT_CATEGORIES = [
  { categoryId: 1, categoryName: 'Sách vở', description: 'Sách giáo trình, truyện, vở ghi' },
  { categoryId: 2, categoryName: 'Quần áo', description: 'Quần áo, phụ kiện thời trang' },
  { categoryId: 3, categoryName: 'Phòng trọ', description: 'Thông tin phòng trọ, ký túc xá' },
  { categoryId: 4, categoryName: 'Đồ điện tử', description: 'Điện thoại, laptop, thiết bị điện tử' },
  { categoryId: 5, categoryName: 'Đồ gia dụng', description: 'Đồ dùng sinh hoạt, nội thất nhỏ' },
  { categoryId: 6, categoryName: 'Đồ thể thao', description: 'Dụng cụ, trang phục luyện tập thể thao' },
  { categoryId: 7, categoryName: 'Khóa học', description: 'Khóa học online/offline, tài liệu học tập' },
];

async function ensureDefaultCategories() {
  const ids = DEFAULT_CATEGORIES.map((cat) => cat.categoryId);

  for (const category of DEFAULT_CATEGORIES) {
    await pool.query(
      `
        INSERT INTO Category (categoryId, categoryName, description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          categoryName = VALUES(categoryName),
          description = VALUES(description)
      `,
      [category.categoryId, category.categoryName, category.description || null]
    );
  }

  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(', ');
    await pool.query(
      `
        DELETE FROM Category
        WHERE categoryId NOT IN (${placeholders})
      `,
      ids
    );
  }
}

// Lấy tất cả danh mục (mở cho mọi người dùng)
categoryRouter.get('/', async (req, res, next) => {
  try {
    await ensureDefaultCategories();
    const [rows] = await pool.query('SELECT * FROM Category ORDER BY categoryId');
    res.json({
      success: true,
      categories: rows
    });
  } catch (error) {
    next(error);
  }
});

export default categoryRouter;
