'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useCart } from '../../context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Minus, Plus } from 'lucide-react';

import { resolveProductImage } from '../../lib/image';

const resolveImageUrl = (item) =>
  resolveProductImage(
    item,
    `https://placehold.co/100x100/eee/31343C?text=${encodeURIComponent(
      item?.productName || item?.title || 'Sản phẩm'
    )}`
  );

export default function CartPage() {
  const { cartItems, removeFromCart, itemCount, updateQuantity } = useCart();

  // Calculate total price
  const totalPrice = cartItems.reduce((sum, item) => {
    const price = Number(item.unitPrice) || Number(item.price) || 0;
    return sum + (price * item.quantity);
  }, 0);

  const handleCheckout = () => {
    alert(`Tiến hành đặt hàng với tổng tiền: ${totalPrice.toLocaleString('vi-VN')} ₫ (Giả lập)`);
  };

  // Handle direct quantity input change
  const handleQuantityChange = (itemId, event) => {
    const newQuantity = parseInt(event.target.value, 10);
    if (!isNaN(newQuantity) && newQuantity > 0) {
      updateQuantity(itemId, newQuantity);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Giỏ hàng của bạn ({itemCount})</h1>

        {itemCount === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-gray-600">
              <p className="text-lg mb-4">Giỏ hàng của bạn đang trống.</p>
              <Link href="/home">
                <Button variant="primary">Tiếp tục mua sắm</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Cart Items List */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const itemId = item.productId || item.id;
                const itemName = item.productName || item.title || 'Sản phẩm';
                const itemPrice = Number(item.unitPrice) || Number(item.price) || 0;
                
                return (
                  <Card key={itemId} className="overflow-hidden">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 relative">
                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 p-1 h-auto text-gray-400 hover:text-red-500 hover:bg-red-50"
                        onClick={() => removeFromCart(itemId)}
                        aria-label={`Xóa ${itemName}`}
                      >
                        <Trash2 size={16} />
                      </Button>

                      {/* Image */}
                      <Image
                        src={resolveImageUrl(item)}
                        alt={itemName}
                        width={80}
                        height={80}
                        className="rounded-md object-cover flex-shrink-0 border"
                      />

                      {/* Product Info */}
                      <div className="flex-grow min-w-0">
                        <h3 className="font-semibold truncate" title={itemName}>
                          {itemName}
                        </h3>
                        <p className="font-bold text-primary mt-1">
                          {itemPrice === 0 
                            ? 'Miễn phí' 
                            : `${itemPrice.toLocaleString('vi-VN')} ₫`}
                        </p>
                      </div>

                      {/* Quantity Selector */}
                      <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="p-1 h-auto w-7"
                          onClick={() => updateQuantity(itemId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={14} />
                        </Button>
                        
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(itemId, e)}
                          className="text-sm font-medium w-12 h-8 text-center px-1"
                        />
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="p-1 h-auto w-7"
                          onClick={() => updateQuantity(itemId, item.quantity + 1)}
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 shadow-md">
                <CardHeader>
                  <CardTitle>Tóm tắt đơn hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính ({itemCount} sản phẩm)</span>
                    <span className="font-medium">{totalPrice.toLocaleString('vi-VN')} ₫</span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Tổng cộng</span>
                    <span className="text-primary">{totalPrice.toLocaleString('vi-VN')} ₫</span>
                  </div>
                  <Button size="lg" className="w-full" onClick={handleCheckout}>
                    Tiến hành đặt hàng
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
