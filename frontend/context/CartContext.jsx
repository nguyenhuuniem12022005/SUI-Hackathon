'use client';
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import {
  fetchCartItems as fetchCartItemsApi,
  addProductToCart as addProductToCartApi,
  updateCartItemQuantity as updateCartItemQuantityApi,
  removeCartItem as removeCartItemApi,
  clearCartItems as clearCartItemsApi,
} from '../lib/api';

const CartContext = createContext();

const getInitialCart = () => {
  if (typeof window === 'undefined') return [];
  const savedCart = localStorage.getItem('pmarket-cart');
  if (!savedCart) return [];
  try {
    return JSON.parse(savedCart) || [];
  } catch (error) {
    console.error('[Cart] Failed to parse local cart', error);
    return [];
  }
};

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState(getInitialCart);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAuthenticated) {
      localStorage.removeItem('pmarket-cart');
      return;
    }
    localStorage.setItem('pmarket-cart', JSON.stringify(cartItems));
  }, [cartItems, isAuthenticated]);

  const loadCartFromServer = useCallback(async () => {
    if (!isAuthenticated) {
      setCartItems(getInitialCart());
      return;
    }

    try {
      const localCart = getInitialCart();
      if (localCart.length > 0) {
        for (const item of localCart) {
          const productId = item?.productId ?? item?.id;
          const quantity = item?.quantity ?? 1;
          if (productId) {
            try {
              await addProductToCartApi(productId, quantity);
            } catch (error) {
              console.warn(
                '[Cart] Không thể đồng bộ sản phẩm local lên server:',
                error.message
              );
            }
          }
        }
        localStorage.removeItem('pmarket-cart');
      }

      const serverItems = await fetchCartItemsApi();
      setCartItems(serverItems);
    } catch (error) {
      console.error('[Cart] Không tải được giỏ hàng từ server:', error);
      toast.error(error.message || 'Không thể tải giỏ hàng.');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCartFromServer();
  }, [loadCartFromServer]);

  const addToCart = async (product, quantity = 1) => {
    if (!product) return;
    const productId = product.productId ?? product.id;
    const productTitle = product.productName || product.title || 'Sản phẩm';
    const normalizedQuantity = Math.max(1, Number(quantity) || 1);

    if (!productId) {
      toast.error('Không xác định được sản phẩm để thêm vào giỏ hàng.');
      return;
    }

    if (!isAuthenticated) {
      setCartItems((prevItems) => {
        const existingItem = prevItems.find((item) => (item.id ?? item.productId) === productId);
        if (existingItem) {
          toast.error(`${productTitle} đã có trong giỏ!`);
          return prevItems;
        }
        toast.success(`Đã thêm ${productTitle} vào giỏ!`);
        return [
          ...prevItems,
          { ...product, id: productId, quantity: normalizedQuantity, title: productTitle },
        ];
      });
      return;
    }

    try {
      const items = await addProductToCartApi(productId, normalizedQuantity);
      setCartItems(items);
      toast.success(`Đã thêm ${productTitle} vào giỏ!`);
    } catch (error) {
      console.error('[Cart] addToCart failed:', error);
      toast.error(error.message || 'Không thể thêm sản phẩm vào giỏ.');
    }
  };

  const removeFromCart = async (productId) => {
    if (!productId) return;

    if (!isAuthenticated) {
      setCartItems((prevItems) =>
        prevItems.filter((item) => (item.id ?? item.productId) !== productId)
      );
      toast.success('Đã xóa sản phẩm khỏi giỏ.');
      return;
    }

    try {
      const items = await removeCartItemApi(productId);
      setCartItems(items);
      toast.success('Đã xóa sản phẩm khỏi giỏ.');
    } catch (error) {
      console.error('[Cart] removeFromCart failed:', error);
      toast.error(error.message || 'Không thể xóa sản phẩm.');
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (!productId) return;
    const quantity = Math.max(1, parseInt(newQuantity, 10) || 1);

    if (!isAuthenticated) {
      setCartItems((prevItems) =>
        prevItems.map((item) =>
          (item.id ?? item.productId) === productId ? { ...item, quantity } : item
        )
      );
      return;
    }

    try {
      const items = await updateCartItemQuantityApi(productId, quantity);
      setCartItems(items);
    } catch (error) {
      console.error('[Cart] updateQuantity failed:', error);
      toast.error(error.message || 'Không thể cập nhật số lượng.');
    }
  };

  const clearCart = async () => {
    if (!isAuthenticated) {
      setCartItems([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pmarket-cart');
      }
      return;
    }

    try {
      await clearCartItemsApi();
      setCartItems([]);
    } catch (error) {
      console.error('[Cart] clearCart failed:', error);
      toast.error(error.message || 'Không thể làm trống giỏ hàng.');
    }
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    itemCount: cartItems.length,
    reloadCart: loadCartFromServer,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
