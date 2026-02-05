import axios from "axios";

const RAW_API_URL = (process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL.trim()) || "https://p-market.onrender.com";
const API_URL = RAW_API_URL.replace(/\/$/, "");

// Axios instance có sẵn baseURL
const api = axios.create({
  baseURL: API_URL,
});

// ===================== CATEGORY HELPERS =====================
const removeAccents = (str = "") =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ä‘/g, "d")
    .replace(/Ä/g, "D");

const sanitizeSlug = (str = "") =>
  removeAccents(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "category";

export function buildCategorySlug(category) {
  if (!category) return "";
  const idPart = category.categoryId || category.id || "";
  const slugPart = sanitizeSlug(category.categoryName || category.name || "");
  return `${idPart}-${slugPart}`.replace(/^-/, "");
}

export function extractCategoryIdFromSlug(slug) {
  if (!slug) return null;
  const match = String(slug).match(/^\d+/);
  return match ? Number(match[0]) : null;
}

export const buildAvatarUrl = (src) => {
  if (!src || typeof src !== "string") return "/avatar.png";
  const trimmed = src.trim();
  if (/^(https?:|data:)/i.test(trimmed) || trimmed.startsWith("//")) return trimmed;

  const cleaned = trimmed.replace(/^public\//i, "").replace(/^\/+/, "");
  return `${API_URL}/${cleaned}`;
};

// ===================== TOKEN QU?N L? =====================
export const setAuthToken = (token) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("pmarket_token", token);
  }
};

export const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("pmarket_token");
  }
  return null;
};

export const removeAuthToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("pmarket_token");
    localStorage.removeItem("pmarket_user");
  }
};

function authHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Add auth header cho axios instance
api.interceptors.request.use((config) => {
  config.headers = {
    ...(config.headers || {}),
    ...authHeader(),
  };
  return config;
});

// ===================== X? L? L?I AXIOS =====================
function handleAxiosError(error) {
  if (error.response) {
    const message = error.response.data.message || `L?i API (${error.response.status})`;
    throw new Error(message);
  }
  throw new Error("Y?u c?u m?ng th?t b?i ho?c l?i kh?ng x?c ??nh.");
}

// ===================== AUTH API =====================
export async function registerUser(formData) {
  try {
    const res = await axios.post(`${API_URL}/auth/register`, formData);
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function loginUser(email, password) {
  try {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    const data = res.data;

    if (data.success && data.token) {
      const tokenString = data.token.access_token;
      const userInfo = data.user;
      setAuthToken(tokenString);
      if (typeof window !== "undefined") {
        localStorage.setItem("pmarket_user", JSON.stringify(userInfo));
      }
    }
    return data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function logoutUser() {
  try {
    const res = await axios.post(`${API_URL}/auth/logout`, {}, { headers: authHeader() });
    removeAuthToken();
    return res.data;
  } catch (error) {
    removeAuthToken();
    handleAxiosError(error);
  }
}

// ===================== USER API =====================
export async function uploadUserAvatar(file) {
  try {
    const formData = new FormData();
    formData.append("avatar", file);

    const res = await axios.patch(
      `${API_URL}/users/me/upload-avatar`,
      formData,
      {
        headers: {
          ...authHeader(),
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function updateUserProfile(profileData = {}) {
  try {
    const userName = profileData.userName || "";
    const phone = profileData.phone || "";
    const address = profileData.address || "";

    const headers = {
      ...authHeader(),
      "Content-Type": "application/json",
    };

    const results = [];

    if (userName.trim() !== "") {
      const res = await axios.patch(
        `${API_URL}/users/me/update-userName`,
        { userName },
        { headers }
      );
      results.push(res.data);
    }

    if (phone.trim() !== "") {
      const res = await axios.patch(
        `${API_URL}/users/me/update-phone`,
        { phone },
        { headers }
      );
      results.push(res.data);
    }

    if (address.trim() !== "") {
      const res = await axios.patch(
        `${API_URL}/users/me/update-address`,
        { address },
        { headers }
      );
      results.push(res.data);
    }

    if (results.length === 0) {
      return { success: false, message: "Kh?ng c? d? li?u n?o ?? c?p nh?t." };
    }

    return {
      success: true,
      message: "C?p nh?t th?ng tin c? nh?n th?nh c?ng!",
      results,
    };
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function resetPasswordAPI(passwordData) {
  try {
    const res = await axios.patch(
      `${API_URL}/users/me/update-password`,
      passwordData,
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function requestPasswordResetAPI(email) {
  try {
    const res = await axios.post(
      `${API_URL}/auth/password-reset/request`,
      { email }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function confirmPasswordResetAPI(token, password) {
  try {
    const res = await axios.post(
      `${API_URL}/auth/password-reset/confirm`,
      { token, password }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function updateUserDateOfBirth(dateOfBirth) {
  try {
    const res = await axios.patch(
      `${API_URL}/users/me/update-date-of-birth`,
      { dateOfBirth },
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchWalletInfo() {
  try {
    const res = await axios.get(`${API_URL}/users/me/wallet`, {
      headers: authHeader(),
    });
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchUserBalance() {
  try {
    const res = await axios.get(`${API_URL}/users/me/balance`, {
      headers: authHeader(),
    });
    return res.data?.data || { availableBalance: 0, lockedBalance: 0 };
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function connectHsWallet(payload) {
  try {
    const res = await axios.post(`${API_URL}/users/me/wallet/connect`, payload, {
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
    });
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function disconnectHsWallet() {
  try {
    const res = await axios.delete(`${API_URL}/users/me/wallet/connect`, {
      headers: authHeader(),
    });
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function executeSimpleToken(payload) {
  try {
    const res = await axios.post(`${API_URL}/blockchain/simple-token/execute`, payload, {
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
    });
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function createEscrowOrder(payload) {
  try {
    const res = await axios.post(`${API_URL}/orders`, payload, {
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
    });
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchSimpleTokenHistory(caller, limit = 20) {
  try {
    const res = await axios.get(`${API_URL}/blockchain/simple-token/history`, {
      params: { caller, limit },
      headers: authHeader(),
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchSimpleTokenAlerts(params = {}) {
  try {
    const res = await axios.get(`${API_URL}/blockchain/simple-token/alerts`, {
      params,
      headers: authHeader(),
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function adjustReputationScore(amount) {
  try {
    const res = await axios.patch(
      `${API_URL}/users/me/update-reputation-score`,
      { amount },
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function adjustGreenCredit(amount) {
  try {
    const res = await axios.patch(
      `${API_URL}/users/me/update-green-credit`,
      { amount },
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function convertGreenCredit(amount) {
  try {
    const res = await axios.post(
      `${API_URL}/users/me/convert-green-credit`,
      { amount },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function getUserDashboard() {
  try {
    const res = await axios.get(
      `${API_URL}/users/me/dashboard`,
      { headers: authHeader() }
    );
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== PRODUCT API =====================
export async function getAllProducts(limit = 50) {
  try {
    const res = await axios.get(`${API_URL}/products`);
    const products = res.data.products || [];
    return products.slice(0, limit);
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export async function getProductById(productId) {
  try {
    const res = await axios.get(
      `${API_URL}/products/${productId}`,
      { headers: authHeader() }
    );
    return res.data.product || null;
  } catch (error) {
    console.error('Error fetching product details:', error);
    return null;
  }
}

export async function getReviewsByProductId(productId) {
  try {
    const res = await axios.get(`${API_URL}/products/${productId}/reviews`, {
      headers: authHeader(),
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function createProductReview(productId, payload) {
  try {
    const res = await axios.post(
      `${API_URL}/products/${productId}/reviews`,
      payload,
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function flagReview(reviewId, reason = '') {
  try {
    const res = await axios.post(
      `${API_URL}/products/reviews/${reviewId}/flag`,
      { reason },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function createProduct(productData) {
  try {
    const isFormData = typeof FormData !== "undefined" && productData instanceof FormData;
    const res = await axios.post(
      `${API_URL}/products/new-product`,
      productData,
      { 
        headers: {
          ...authHeader(),
          ...(isFormData ? {} : { "Content-Type": "application/json" })
        }
      }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function searchProducts(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    if (params.searchTerm) queryParams.append('searchTerm', params.searchTerm);
    if (params.q) queryParams.append('searchTerm', params.q);
    if (params.categoryId) queryParams.append('categoryId', params.categoryId);

    const res = await axios.get(
      `${API_URL}/products?${queryParams.toString()}`,
      { headers: authHeader() }
    );
    
    return {
      success: res.data.success,
      items: res.data.products || [],
      message: res.data.message
    };
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function updateProduct(productId, productData) {
  try {
    const isFormData = typeof FormData !== "undefined" && productData instanceof FormData;
    const res = await axios.put(
      `${API_URL}/products/${productId}/update-product`,
      productData,
      { 
        headers: {
          ...authHeader(),
          ...(isFormData ? {} : { "Content-Type": "application/json" })
        }
      }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function deleteProduct(productId) {
  try {
    const res = await axios.delete(
      `${API_URL}/products/${productId}/delete-product`,
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchMyProducts() {
  try {
    const res = await axios.get(`${API_URL}/products/my`, {
      headers: authHeader(),
    });
    return res.data?.products || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchMyProductDetail(productId) {
  try {
    const res = await axios.get(`${API_URL}/products/${productId}/manage`, {
      headers: authHeader(),
    });
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function updateProductStatus(productId, status) {
  try {
    const res = await axios.patch(
      `${API_URL}/products/${productId}/update-product-status`,
      { status },
      {
        headers: {
          ...authHeader(),
          'Content-Type': 'application/json',
        },
      }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function requestProductAudit(productId, payload) {
  try {
    const res = await axios.post(
      `${API_URL}/products/${productId}/audits`,
      payload,
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchProductAudits(productId) {
  try {
    const res = await axios.get(`${API_URL}/products/${productId}/audits`, {
      headers: authHeader(),
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchPendingProductAudits() {
  try {
    const res = await axios.get(`${API_URL}/products/audits/pending`, {
      headers: authHeader(),
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function reviewProductAudit(productId, auditId, payload) {
  try {
    const res = await axios.patch(
      `${API_URL}/products/${productId}/audits/${auditId}`,
      payload,
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== STORE API =====================
export async function addProductToStore(storeData) {
  try {
    const res = await axios.post(
      `${API_URL}/stores/add-store`,
      storeData,
      {
        headers: {
          ...authHeader(),
          "Content-Type": "application/json"
        }
      }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== WAREHOUSE API =====================
export async function fetchWarehouses() {
  try {
    const res = await axios.get(
      `${API_URL}/warehouses`,
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== DIAGNOSTIC API =====================
export async function fetchDataOverview() {
  try {
    const res = await axios.get(
      `${API_URL}/reports/data-overview`,
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== CHAT API =====================
export async function createChatRoomForProduct(productId) {
  try {
    const res = await axios.post(
      `${API_URL}/chatrooms/by-product`,
      { productId },
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchChatMessages(chatRoomId) {
  try {
    const res = await axios.get(
      `${API_URL}/chatrooms/${chatRoomId}/messages`,
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function sendChatMessage(chatRoomId, content) {
  const response = await api.post(`/chatrooms/${chatRoomId}/messages`, { content });
  // Backend trả { success, message }, không bọc trong data.data
  return response.data;
}

export async function chatWithAI(message) {
  const response = await api.post('/ai/chat', { message });
  return response.data;
}

export async function fetchChatRooms() {
  try {
    const res = await axios.get(
      `${API_URL}/chatrooms`,
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== CART API =====================
export async function fetchCartItems() {
  try {
    const res = await axios.get(`${API_URL}/cart`, {
      headers: authHeader()
    });
    return res.data.items || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function addProductToCart(productId, quantity = 1) {
  try {
    const res = await axios.post(
      `${API_URL}/cart`,
      { productId, quantity },
      { headers: { ...authHeader() } }
    );
    return res.data.items || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function updateCartItemQuantity(productId, quantity) {
  try {
    const res = await axios.patch(
      `${API_URL}/cart/${productId}`,
      { quantity },
      { headers: { ...authHeader() } }
    );
    return res.data.items || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function removeCartItem(productId) {
  try {
    const res = await axios.delete(`${API_URL}/cart/${productId}`, {
      headers: authHeader()
    });
    return res.data.items || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function clearCartItems() {
  try {
    const res = await axios.delete(`${API_URL}/cart`, {
      headers: authHeader()
    });
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== CATEGORY API =====================
export async function fetchCategories() {
  try {
    const res = await axios.get(`${API_URL}/categories`, {
      headers: authHeader()
    });
    return res.data;
  } catch (error) {
    console.warn('fetchCategories error:', error.message);
    return {
      success: true,
      categories: [
        { categoryId: 1, categoryName: 'S?ch & V?n ph?ng ph?m' },
        { categoryId: 2, categoryName: '?? ?i?n t?' },
        { categoryId: 3, categoryName: 'Th?i trang' },
        { categoryId: 4, categoryName: '?? gia d?ng' },
        { categoryId: 5, categoryName: 'Th? thao & S?c kh?e' },
        { categoryId: 6, categoryName: 'Kh?c' }
      ]
    };
  }
}

// ===================== SELLER ANALYTICS API =====================
export async function fetchSellerRevenue(year) {
  const res = await api.get('/reports/seller/revenue', { params: { year } });
  return res.data?.data;
}

export async function fetchSellerTopProducts(params = {}) {
  const res = await api.get('/reports/seller/top-products', { params });
  return res.data?.data || [];
}

export async function fetchSellerCompletion(params = {}) {
  const res = await api.get('/reports/seller/order-completion', { params });
  return res.data?.data;
}

// ===================== BLOCKCHAIN API =====================
export async function fetchGreenCreditSummary() {
  try {
    const res = await axios.get(`${API_URL}/blockchain/green-credit`, {
      headers: authHeader()
    });
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function requestGreenCreditSync(reason = '') {
  try {
    const res = await axios.post(
      `${API_URL}/blockchain/green-credit/sync`,
      { reason },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchDeveloperApps() {
  try {
    const res = await axios.get(`${API_URL}/blockchain/developer/apps`, {
      headers: authHeader()
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function registerDeveloperApp(payload) {
  try {
    const res = await axios.post(
      `${API_URL}/blockchain/developer/apps`,
      payload,
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchDeveloperMetrics() {
  try {
    const res = await axios.get(`${API_URL}/blockchain/developer/metrics`, {
      headers: authHeader()
    });
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchHscoinAdminCalls(params = {}) {
  try {
    const res = await axios.get(`${API_URL}/blockchain/simple-token/admin/calls`, {
      params,
      headers: authHeader()
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function saveUserContract(payload) {
  try {
    const res = await axios.post(
      `${API_URL}/blockchain/contracts`,
      payload,
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchUserContracts() {
  try {
    const res = await axios.get(`${API_URL}/blockchain/contracts`, {
      headers: authHeader(),
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function compileContract(payload) {
  try {
    const res = await axios.post(
      `${API_URL}/blockchain/contracts/compile`,
      payload,
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function deployContract(payload) {
  try {
    const res = await axios.post(
      `${API_URL}/blockchain/contracts/deploy`,
      payload,
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function autoDeployDefaultContract() {
  try {
    const res = await axios.post(
      `${API_URL}/blockchain/contracts/auto-deploy`,
      {},
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// Mint token nội bộ (mintSelf) cho ví caller trên contract mặc định
// Dùng format inputData (calldata) để tránh lỗi API 405
export async function mintSelfToken({ amountWei, caller, contractAddress }) {
  try {
    // Encode mint(address,uint256) call thành calldata
    const calldata = encodeFunctionCall('mint', [caller, amountWei]);
    
    // Gọi với format inputData để tránh lỗi 405
    const res = await axios.post(
      `${API_URL}/blockchain/simple-token/execute`,
      {
        caller,
        inputData: calldata.startsWith('0x') ? calldata : `0x${calldata}`,
        value: 0,
        contractAddress,
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchMyAccountBalance() {
  try {
    const res = await axios.get(`${API_URL}/blockchain/accounts/me`, {
      headers: authHeader(),
    });
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// Helper: Encode function call to calldata hex
// Function selector = keccak256(functionSignature).slice(0, 10)
// Ví dụ: getBalance(address) -> selector + encoded address
function encodeFunctionCall(functionName, params = []) {
  // Function selectors (4 bytes đầu của keccak256 hash)
  const SELECTORS = {
    getBalance: '0xf8b2cb4f', // getBalance(address)
    deposit: '0x8340f549', // deposit(uint256,address,uint256)
    release: '0x37bdc99b', // release(uint256)
    refund: '0x7c41ad2c', // refund(uint256)
    transfer: '0xa9059cbb', // transfer(address,uint256)
    mint: '0x40c10f19', // mint(address,uint256)
    balanceOf: '0x70a08231', // balanceOf(address)
  };

  const selector = SELECTORS[functionName];
  if (!selector) {
    throw new Error(`Function ${functionName} không được hỗ trợ`);
  }

  // Encode parameters
  let encodedParams = '';
  for (const param of params) {
    if (typeof param === 'string' && param.startsWith('0x')) {
      // Address: remove 0x, pad to 64 hex chars (32 bytes)
      const addr = param.substring(2).toLowerCase();
      encodedParams += addr.padStart(64, '0');
    } else if (typeof param === 'number' || typeof param === 'bigint') {
      // Uint256: convert to hex, pad to 64 hex chars
      const num = BigInt(param);
      encodedParams += num.toString(16).padStart(64, '0');
    } else if (typeof param === 'string') {
      // Assume it's a hex string without 0x
      encodedParams += param.toLowerCase().padStart(64, '0');
    } else {
      // Convert to string and pad
      encodedParams += String(param).padStart(64, '0');
    }
  }

  return selector + encodedParams;
}

// Execute contract với inputData (calldata hex)
export async function executeContractWithCalldata({ contractAddress, caller, inputData, value = 0 }) {
  try {
    const res = await axios.post(
      `${API_URL}/blockchain/simple-token/execute`,
      {
        caller,
        inputData: inputData.startsWith('0x') ? inputData : `0x${inputData}`,
        value,
        contractAddress,
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// Get balance bằng cách gọi getBalance function với calldata
// Gọi trực tiếp API giống như mintSelfToken để đảm bảo consistency
export async function fetchTokenBalance({ contractAddress, walletAddress } = {}) {
  try {
    // Nếu không có walletAddress, dùng API cũ
    if (!walletAddress) {
      const params = {};
      if (contractAddress) params.contractAddress = contractAddress;
      const res = await axios.get(`${API_URL}/blockchain/token-balance`, {
        params,
        headers: authHeader(),
      });
      return res.data?.data?.balance;
    }

    // Nếu có walletAddress, gọi getBalance với calldata
    if (!contractAddress) {
      // Lấy contract mặc định từ backend
      const contractsRes = await axios.get(`${API_URL}/blockchain/contracts`, {
        headers: authHeader(),
      });
      const contracts = contractsRes.data?.data || [];
      const defaultContract = contracts.find((c) => c.isDefault);
      if (!defaultContract?.address) {
        throw new Error('Chưa có contract mặc định. Vui lòng deploy contract trước.');
      }
      contractAddress = defaultContract.address;
    }

    // Encode getBalance(address) call thành calldata
    const calldata = encodeFunctionCall('getBalance', [walletAddress]);

    // Gọi trực tiếp API giống như mintSelfToken
    const res = await axios.post(
      `${API_URL}/blockchain/simple-token/execute`,
      {
        caller: walletAddress,
        inputData: calldata.startsWith('0x') ? calldata : `0x${calldata}`,
        value: 0,
        contractAddress,
      },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );

    const result = res.data?.data;

    // Parse returnData từ response
    // Backend trả về: { data: { result: { returnData: "0x..." } } } hoặc { data: { returnData: "0x..." } }
    // Hoặc từ HSCOIN trực tiếp: { data: { returnData: "0x..." } }
    const returnData = 
      result?.result?.returnData || 
      result?.returnData || 
      result?.data?.returnData || 
      res.data?.returnData || 
      res.data?.data?.returnData ||
      (result?.result && typeof result.result === 'string' && result.result.startsWith('0x') ? result.result : null);
    
    if (returnData && returnData !== '0x' && returnData !== '0x0' && returnData !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      try {
        // returnData là hex string, decode uint256
        const hex = returnData.startsWith('0x') ? returnData.substring(2) : returnData;
        // Lấy 64 ký tự cuối (32 bytes cho uint256)
        // Nếu hex ngắn hơn 64, pad với 0 ở đầu
        const balanceHex = hex.length >= 64 ? hex.slice(-64) : hex.padStart(64, '0');
        return BigInt('0x' + balanceHex).toString();
      } catch (error) {
        console.error('[API] Lỗi parse returnData:', error, 'returnData:', returnData, 'full response:', res.data);
        throw new Error(`Không thể parse số dư từ response: ${error.message}`);
      }
    }

    // Nếu không có returnData, có thể là view function không trả về gì
    console.warn('[API] Không có returnData trong response:', res.data);
    throw new Error('Không nhận được số dư từ blockchain. Vui lòng kiểm tra contract address và thử lại.');
  } catch (error) {
    console.error('[API] Lỗi fetchTokenBalance:', error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    if (error.message) {
      throw error;
    }
    throw new Error('Không thể tải số dư token. Vui lòng kiểm tra contract address và thử lại.');
  }
}

// Escrow functions với calldata format
export async function escrowDeposit({ contractAddress, caller, orderId, sellerAddress, amountWei }) {
  try {
    const calldata = encodeFunctionCall('deposit', [orderId, sellerAddress, amountWei]);
    return await executeContractWithCalldata({
      contractAddress,
      caller,
      inputData: calldata,
      value: 0,
    });
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function escrowRelease({ contractAddress, caller, orderId }) {
  try {
    const calldata = encodeFunctionCall('release', [orderId]);
    return await executeContractWithCalldata({
      contractAddress,
      caller,
      inputData: calldata,
      value: 0,
    });
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function escrowRefund({ contractAddress, caller, orderId }) {
  try {
    const calldata = encodeFunctionCall('refund', [orderId]);
    return await executeContractWithCalldata({
      contractAddress,
      caller,
      inputData: calldata,
      value: 0,
    });
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function redeemGreenBadge() {
  try {
    const res = await axios.post(
      `${API_URL}/users/me/green-badge/redeem`,
      {},
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== ORDER API =====================
export async function fetchMyOrders() {
  try {
    const res = await axios.get(`${API_URL}/orders/me`, {
      headers: authHeader(),
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchSellerOrders() {
  try {
    const res = await axios.get(`${API_URL}/orders/seller`, {
      headers: authHeader(),
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function confirmOrderAsBuyer(orderId, payload = {}) {
  try {
    const res = await axios.post(
      `${API_URL}/orders/${orderId}/confirm-buyer`,
      payload,
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function confirmOrderAsSeller(orderId) {
  try {
    const res = await axios.post(
      `${API_URL}/orders/${orderId}/confirm-seller`,
      {},
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}
export async function cancelOrder(orderId) {
  try {
    const res = await axios.post(
      `${API_URL}/orders/${orderId}/cancel`,
      {},
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchOrderDetail(orderId) {
  try {
    const res = await axios.get(`${API_URL}/orders/${orderId}`, {
      headers: authHeader(),
    });
    return res.data?.data || null;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchEscrowEvents() {
  try {
    const res = await axios.get(`${API_URL}/orders/me/escrow`, {
      headers: authHeader(),
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}


export async function retryHscoinCall(callId) {
  try {
    const res = await axios.post(
      `${API_URL}/blockchain/simple-token/calls/${callId}/retry`,
      {},
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function verifyHscoinCallTxHash(callId) {
  try {
    const res = await axios.get(
      `${API_URL}/blockchain/simple-token/calls/${callId}/verify`,
      { headers: authHeader() }
    );
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}
// ===================== REFERRAL / REWARDS API =====================
export async function fetchReferralSummary() {
  try {
    const res = await axios.get(`${API_URL}/referrals/me`, {
      headers: authHeader()
    });
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchReferralRewards() {
  try {
    const res = await axios.get(`${API_URL}/referrals/rewards`, {
      headers: authHeader()
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function markReferralQualified(referredUserId) {
  try {
    const res = await axios.post(
      `${API_URL}/referrals/qualify`,
      { referredUserId },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function rewardReferral(payload) {
  try {
    const res = await axios.post(
      `${API_URL}/referrals/reward`,
      payload,
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data?.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchReputationLedger(limit = 50) {
  try {
    const res = await axios.get(`${API_URL}/users/me/reputation-ledger`, {
      params: { limit },
      headers: authHeader(),
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchNotifications(params = {}) {
  try {
    const res = await axios.get(`${API_URL}/users/me/notifications`, {
      params,
      headers: authHeader(),
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function markNotificationsRead(ids = []) {
  try {
    const res = await axios.patch(
      `${API_URL}/users/me/notifications/read`,
      { ids },
      { headers: { ...authHeader(), 'Content-Type': 'application/json' } }
    );
    return res.data?.success;
  } catch (error) {
    handleAxiosError(error);
  }
}

// Reviews
export async function fetchMyReviews() {
  try {
    const res = await axios.get(`${API_URL}/users/me/reviews`, {
      headers: authHeader(),
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchMonthlyLeaderboard(params = {}) {
  try {
    const res = await axios.get(`${API_URL}/users/leaderboard/monthly`, {
      params,
      headers: authHeader(),
    });
    return res.data?.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}




