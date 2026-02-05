import { GoogleGenerativeAI } from '@google/generative-ai';
import * as productService from '../services/productService.js';

export async function chatWithAI(req, res, next) {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tin nhắn.' });
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      console.error('[AI] Thiếu GEMINI_API_KEY trong biến môi trường');
      return res.status(503).json({
        success: false,
        message: 'Chức năng AI chưa được cấu hình (thiếu API Key).',
      });
    }

    // 1. Tìm kiếm sản phẩm liên quan để làm context
    const keywords = message.split(' ').filter(w => w.length > 3).join(' ');
    let productContext = '';
    
    try {
        const products = await productService.searchProducts(keywords, null);
        if (products && products.length > 0) {
            const topProducts = products.slice(0, 5).map(p => 
                `- ${p.productName} (Giá: ${p.unitPrice || p.price || 0} VND): ${p.description?.substring(0, 100) || ''}...`
            ).join('\n');
            productContext = `Dưới đây là một số sản phẩm có thể liên quan từ cửa hàng P-Market:\n${topProducts}\n`;
        }
    } catch (err) {
        console.warn('AI search product error:', err);
    }

    // 2. Gọi Gemini API (Khởi tạo tại đây để đảm bảo biến môi trường đã load)
    const genAI = new GoogleGenerativeAI(apiKey);
    // Dùng model ổn định (pro/flash). Nếu pro unavailable, flash vẫn chạy được.
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const prompt = `
      Bạn là trợ lý mua sắm ảo thông minh của P-Market (nền tảng thương mại điện tử xanh).
      
      Nhiệm vụ của bạn:
      - Tư vấn sản phẩm cho khách hàng dựa trên nhu cầu của họ.
      - Ưu tiên giới thiệu các sản phẩm thân thiện môi trường, bền vững.
      - Trả lời ngắn gọn, thân thiện, dùng tiếng Việt.
      - Nếu có thông tin sản phẩm được cung cấp bên dưới, hãy dùng nó để trả lời. Nếu không, hãy tư vấn chung.

      ${productContext}

      Khách hàng hỏi: "${message}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({
      success: true,
      reply: text,
    });

  } catch (error) {
    const msg = error?.message || 'Unknown error';
    console.error('AI Chat Error:', msg);
    if (error?.response?.error?.message) {
      console.error('Gemini detail:', error.response.error.message);
    }
    return res.status(500).json({
      success: false,
      message: 'Xin lỗi, trợ lý AI đang bận hoặc không kết nối được. Vui lòng thử lại sau.',
    });
  }
}
