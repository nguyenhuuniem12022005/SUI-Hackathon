'use client';
import { useState, useEffect } from 'react';
import { Container } from '../../../components/ui/Container';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import ConnectWalletButton from '../../../components/blockchain/ConnectWalletButton';
import { useWallet } from '../../../context/WalletContext';
import { UploadCloud, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { createProduct, updateProduct, addProductToStore, fetchWarehouses, fetchCategories, executeSimpleToken, fetchMyProductDetail } from '../../../lib/api';

const MAX_PRODUCT_EDITS = 3;

export default function CreateProductPage() {
  const { isConnected, walletAddress, connectWallet } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingProductId = searchParams.get('productId');
  const isEditing = Boolean(editingProductId);
  
  // Step 1: Product info
  const [images, setImages] = useState([]);
  const [imageDirty, setImageDirty] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [discount, setDiscount] = useState('0');
  const [createdProductId, setCreatedProductId] = useState(null);
  const [isGreen, setIsGreen] = useState(false);
  
  // Step 2: Store/Warehouse info
  const [step, setStep] = useState(1); // 1 = Product info, 2 = Store info
  const [quantity, setQuantity] = useState('1');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [warehouseLoadError, setWarehouseLoadError] = useState('');
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoryLoadError, setCategoryLoadError] = useState('');
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingStepOne, setIsSavingStepOne] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [editMeta, setEditMeta] = useState({
    editCount: 0,
    remainingEdits: MAX_PRODUCT_EDITS,
    canEdit: true,
  });

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoadingCategories(true);
      setCategoryLoadError('');
      try {
        const result = await fetchCategories();
        const list = result?.categories || [];
        setCategories(list);
        if (list.length > 0) {
          setCategory((prev) => prev || String(list[0].categoryId));
        }
      } catch (error) {
        setCategoryLoadError(error.message || 'Không tải được danh mục.');
        toast.error(error.message || 'Không tải được danh mục.');
      } finally {
        setIsLoadingCategories(false);
      }
    };

    const loadWarehouses = async () => {
      setIsLoadingWarehouses(true);
      setWarehouseLoadError('');
      try {
        const result = await fetchWarehouses();
        const list = result?.warehouses || [];
        setWarehouses(list);
        if (list.length > 0) {
          setWarehouseId(String(list[0].warehouseId));
        }
      } catch (error) {
        setWarehouseLoadError(error.message || 'Không tải được danh sách kho hàng.');
        toast.error(error.message || 'Không tải được danh sách kho hàng.');
      } finally {
        setIsLoadingWarehouses(false);
      }
    };

    loadCategories();
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (!editingProductId) return;
    setIsLoadingProduct(true);
    (async () => {
      try {
        const detail = await fetchMyProductDetail(editingProductId);
        if (!detail) {
          throw new Error('Không tìm thấy sản phẩm để chỉnh sửa.');
        }
        if (detail.canEdit === false) {
          toast.error('Sản phẩm này không thể chỉnh sửa sau khi đã có giao dịch/đánh giá.');
          router.replace('/dashboard/my-products');
          return;
        }
        setCreatedProductId(detail.productId);
        setTitle(detail.productName || '');
        setDescription(detail.description || '');
        setPrice(detail.unitPrice != null ? String(detail.unitPrice) : '');
        setCategory(detail.categoryId ? String(detail.categoryId) : '');
        setSize(detail.size || '');
        setDiscount(detail.discount != null ? String(detail.discount) : '0');
        setImages(detail.imageURL ? [detail.imageURL] : []);
        setIsGreen(Boolean(detail.isGreen));
        setEditMeta({
          editCount: Number(detail.editCount || 0),
          remainingEdits: Math.max(0, MAX_PRODUCT_EDITS - Number(detail.editCount || 0)),
          canEdit: detail.canEdit !== false,
        });
      } catch (error) {
        toast.error(error.message || 'Không thể tải dữ liệu sản phẩm.');
        router.replace('/dashboard/my-products');
      } finally {
        setIsLoadingProduct(false);
      }
    })();
  }, [editingProductId, router]);

  const validateStep1 = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Tên sản phẩm không được để trống.';
    if (!price.trim()) newErrors.price = 'Giá không được để trống.';
    else if (isNaN(Number(price)) || Number(price) < 0) newErrors.price = 'Giá phải là số không âm.';
    if (description.trim().length > 0 && description.trim().length < 10) newErrors.description = 'Mô tả nên dài ít nhất 10 ký tự.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!quantity.trim()) newErrors.quantity = 'Số lượng không được để trống.';
    else if (isNaN(Number(quantity)) || Number(quantity) < 1) newErrors.quantity = 'Số lượng phải lớn hơn 0.';
    if (!warehouseId) newErrors.warehouseId = 'Vui lòng chọn kho hàng.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      toast.error('Chỉ được upload tối đa 5 ảnh!');
      return;
    }
    setImages(files);
    setImageDirty(true);
  };

  const buildProductFormData = () => {
    const formData = new FormData();
    formData.append('productName', title);
    formData.append('description', description || '');
    formData.append('unitPrice', price);
    formData.append('categoryId', category);
    formData.append('size', size || '');
    formData.append('discount', discount || '0');
    formData.append('isGreen', isGreen ? '1' : '0');

    if ((!createdProductId || imageDirty) && images.length > 0) {
      formData.append('image', images[0]);
    }

    return formData;
  };

  const handleNextStep = async () => {
    if (!validateStep1()) {
      toast.error('Vui lòng kiểm tra lại thông tin sản phẩm.');
      return;
    }
    if (isEditing && editMeta.remainingEdits <= 0) {
      toast.error('Bạn đã hết lượt chỉnh sửa cho sản phẩm này.');
      return;
    }

    setIsSavingStepOne(true);
    try {
      const formData = buildProductFormData();

      if (createdProductId) {
        await updateProduct(createdProductId, formData);
        toast.success('Đã cập nhật thông tin sản phẩm!');
        if (isEditing) {
          setEditMeta((prev) => ({
            ...prev,
            editCount: prev.editCount + 1,
            remainingEdits: Math.max(0, prev.remainingEdits - 1),
          }));
        }
      } else {
        const result = await createProduct(formData);
        const newProductId = result?.product?.productId;
        if (!newProductId) {
          throw new Error('Không lấy được mã sản phẩm.');
        }
        setCreatedProductId(newProductId);
        toast.success('Đã lưu thông tin sản phẩm!');
      }

      setImageDirty(false);
      setStep(2);
    } catch (error) {
      console.error('Error saving product info:', error);
      toast.error(error.message || 'Không thể lưu thông tin sản phẩm.');
    } finally {
      setIsSavingStepOne(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!createdProductId) {
      toast.error('Vui lòng hoàn tất bước 1 trước khi chọn kho hàng.');
      setStep(1);
      return;
    }
    if (!validateStep2()) {
      toast.error('Vui lòng kiểm tra lại thông tin kho hàng.');
      return;
    }

    if (!isConnected || !walletAddress) {
      toast.error('Vui lòng liên kết ví HScoin trước khi đăng bài.');
      connectWallet();
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        productId: Number(createdProductId),
        warehouseId: Number(warehouseId),
        quantity: Number(quantity)
      };
      const result = await addProductToStore(payload);
      
      if (result?.success) {
        toast.success('Đăng bài thành công! Đang trừ phí ký quỹ...');
        const burnAmount = Math.max(1, Math.round(Number(price) || 1));
        try {
          await executeSimpleToken({
            caller: walletAddress,
            method: 'burn',
            args: [burnAmount],
            value: 0,
          });
          toast.success('Đã trừ phí đăng bài trên HScoin.');
        } catch (tokenError) {
          console.error('Burn token error:', tokenError);
          toast.error(tokenError.message || 'Không thể gọi hợp đồng burn token.');
        }
        router.replace(`/home?posted=${Date.now()}`);
      } else {
        toast.error(result?.message || 'Đăng bài thất bại!');
      }
    } catch (error) {
      console.error('Error assigning product to warehouse:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi lưu thông tin kho!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-8">
      {isEditing && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Đang chỉnh sửa sản phẩm #{editingProductId}</p>
          <p>Còn {editMeta.remainingEdits} / {MAX_PRODUCT_EDITS} lượt cập nhật nội dung.</p>
        </div>
      )}
      {isEditing && isLoadingProduct ? (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6 flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="animate-spin" size={16} /> Đang tải dữ liệu sản phẩm...
          </CardContent>
        </Card>
      ) : (
      <form onSubmit={step === 2 ? handleSubmit : (e) => e.preventDefault()}>
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>
              {step === 1 ? 'Bước 1: Thông tin sản phẩm' : 'Bước 2: Thông tin kho hàng'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {step === 1 ? (
              // B�?C 1: TH�NG TIN S?N PH?M
              <div className="space-y-4">
                <div>
                  <label htmlFor="title">Tên sản phẩm</label>
                  <Input 
                    id="title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className={`mt-1 ${errors.title ? 'border-red-500' : ''}`} 
                    placeholder="Nhập tên sản phẩm"
                  />
                  {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category">Danh mục</label>
                    <Select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="mt-1"
                      disabled={isLoadingCategories || categories.length === 0}
                    >
                      {categories.length === 0 ? (
                        <option value="" disabled>
                          {isLoadingCategories ? 'Đang tải danh mục...' : 'Chưa có danh mục'}
                        </option>
                      ) : (
                        categories.map((cat) => (
                          <option key={cat.categoryId} value={cat.categoryId}>
                            {cat.categoryName}
                          </option>
                        ))
                      )}
                    </Select>
                    {categoryLoadError && (
                      <p className="mt-1 text-xs text-red-600">{categoryLoadError}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="size">Kích thước (tùy chọn)</label>
                    <Input 
                      id="size" 
                      value={size} 
                      onChange={(e) => setSize(e.target.value)} 
                      className="mt-1"
                      placeholder="VD: M, L, XL... hoặc size số,diện tích"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="description">Mô tả</label>
                  <Textarea 
                    id="description" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className={`mt-1 ${errors.description ? 'border-red-500' : ''}`} 
                    placeholder="Mô tả chi tiết về sản phẩm..."
                    rows={4}
                  />
                  {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price">Giá (VNĐ)</label>
                    <Input 
                      id="price" 
                      type="text" 
                      value={price} 
                      onChange={(e) => setPrice(e.target.value)} 
                      className={`mt-1 ${errors.price ? 'border-red-500' : ''}`} 
                      placeholder="0"
                    />
                    {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
                  </div>
                  <div>
                    <label htmlFor="discount">Giảm giá (%)</label>
                    <Input 
                      id="discount" 
                      type="text"
                      value={discount} 
                      onChange={(e) => setDiscount(e.target.value)} 
                      className="mt-1"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    id="images"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label htmlFor="images" className="cursor-pointer">
                    <UploadCloud size={40} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">
                      {images.length > 0 ? `Đã chọn ${images.length} ảnh` : 'Upload ảnh sản phẩm'}
                    </p>
                  </label>
                </div>

                <div className="flex items-start gap-3 rounded-lg border p-4 bg-gray-50">
                  <input
                    id="isGreen"
                    type="checkbox"
                    checked={isGreen}
                    onChange={(e) => setIsGreen(e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <label htmlFor="isGreen" className="font-semibold text-sm text-gray-800">
                      Đơn hàng xanh
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      Gắn nhãn “xanh” (tối đa 2 sản phẩm xanh/ngày). Người mua xác nhận hành động xanh sẽ giúp bạn nhận thêm Green Credit.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // B�?C 2: TH�NG TIN KHO H�NG
              <div className="space-y-4">
                <div>
                  <label htmlFor="quantity">Số lượng trong kho</label>
                  <Input 
                    id="quantity" 
                    type="text"
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                    className={`mt-1 ${errors.quantity ? 'border-red-500' : ''}`}
                    placeholder="1"
                  />
                  {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity}</p>}
                </div>

                <div>
                  <label htmlFor="warehouseId">Kho h�ng</label>
                  <Select
                    id="warehouseId"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="mt-1"
                    disabled={isLoadingWarehouses || warehouses.length === 0}
                  >
                    {warehouses.length === 0 ? (
                      <option value="" disabled>
                        {isLoadingWarehouses ? 'Đang tải kho hàng...' : 'Chưa có kho hàng'}
                      </option>
                    ) : (
                      warehouses.map((warehouse) => (
                        <option key={warehouse.warehouseId} value={warehouse.warehouseId}>
                          {warehouse.warehouseName}
                        </option>
                      ))
                    )}
                  </Select>
                  {warehouseLoadError && (
                    <p className="mt-1 text-xs text-red-600">{warehouseLoadError}</p>
                  )}
                  {errors.warehouseId && (
                    <p className="mt-1 text-xs text-red-600">{errors.warehouseId}</p>
                  )}
                </div>

                <hr className="my-6" />
                
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Kết nối ví để xác thực giao dịch và bảo vệ quyền lợi người mua/bán
                  </p>
                  <ConnectWalletButton />
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex gap-2">
            {step === 2 && (
              <Button 
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
              >
                <ArrowLeft size={20} className="mr-2" />
                Quay lai
              </Button>
            )}
            
            {step === 1 ? (
              <Button 
                type="button"
                className="flex-1" 
                size="lg"
                onClick={handleNextStep}
                disabled={isSavingStepOne}
              >
                {isSavingStepOne ? <Loader2 className="animate-spin mr-2" size={20}/> : null}
                {isSavingStepOne ? 'Đang lưu...' : 'Tiếp theo'}
              </Button>
            ) : (
              <Button 
                type="submit" 
                className="flex-1" 
                size="lg" 
                disabled={!isConnected || isSubmitting || isLoadingWarehouses || !createdProductId}
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" size={20}/> : null}
                {isSubmitting ? 'Đang đăng...' : (isConnected ? 'Hoàn tất & Đăng bài' : 'Đăng bài (Cần liên kết ví)')}
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
      )}
    </Container>
  );
}


















