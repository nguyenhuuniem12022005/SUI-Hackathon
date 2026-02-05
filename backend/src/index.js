// backend/src/index.js (ĐÃ FIX LỖI STATIC FILE - localhost mode, SUI Web3)

import express from 'express';
import dotenv from 'dotenv';
import path from 'path'; // ✅ Bổ sung: Import path
import { fileURLToPath } from 'url'; // ✅ Bổ sung: Import để dùng __dirname
import route from './routers/index.js';
import errorHandler from './handlers/errorHandler.js';
import cors from 'cors'; 

dotenv.config();
const app = express();
// Thêm giá trị mặc định cho PORT
const PORT = process.env.PORT || 3001; 

// --- Định nghĩa __dirname cho ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// __dirname hiện tại là thư mục chứa index.js (ví dụ: backend/src)
// Thư mục cần phục vụ là: public/uploads

// --- Cấu hình CORS ---
const allowedOrigins = [
  'http://localhost:3000',
  process.env.CLIENT_URL,
  'https://p-market-1.onrender.com',
  'https://p-market.onrender.com'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // đảm bảo preflight trả header CORS
// --- CẤU HÌNH PHỤC VỤ TỆP TĨNH (STATIC FILE) ---
// 1. Tạo đường dẫn tuyệt đối an toàn
// Dẫn đến: backend/src/public/uploads
const uploadsPath = path.join(__dirname, 'public', 'uploads');

// 2. Chỉ định Express phục vụ thư mục UPLOADS qua đường dẫn '/uploads'
// ✅ CHỈ CẦN KHAI BÁO MỘT LẦN VỚI ĐƯỜNG DẪN TUYỆT ĐỐI
app.use('/uploads', express.static(uploadsPath)); 

// --- Cấu hình Middleware xử lý request body ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// --- Cấu hình Route Handler ---
route(app);

// --- Cấu hình Error Handler (phải ở cuối cùng) ---
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`P-market chạy đường link: http://localhost:${PORT}`);
});
