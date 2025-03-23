import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './Navbar';
import { ItemList } from './ItemList';
import { Cart } from './Cart';
import { useCartStore } from '../lib/store';

export function RetailPage() {
  const [showCart, setShowCart] = React.useState(false);
  const cartItems = useCartStore(state => state.items);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar onCartClick={() => setShowCart(true)} cartItemCount={cartItems.length} />
      
      <Routes>
        <Route path="/" element={<ItemList category={null} />} />
        <Route path="/category/:category" element={<ItemList />} />
      </Routes>

      {showCart && (
        <Cart
          onClose={() => setShowCart(false)}
        />
      )}
    </div>
  );
}