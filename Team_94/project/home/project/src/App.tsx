import React from 'react';
import { Navbar } from './components/Navbar';
import { ItemCard } from './components/ItemCard';
import { Cart } from './components/Cart';
import { supabase } from './lib/supabase';
import type { Database } from './lib/database.types';

type Item = Database['public']['Tables']['items']['Row'] & {
  shops: Database['public']['Tables']['shops']['Row'];
};

interface CartItem extends Item {
  quantity: number;
}

function App() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = React.useState<Item[]>([]);
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
  const [showCart, setShowCart] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchItems();
  }, []);

  React.useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  async function fetchItems() {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          shops (
            name,
            location
          )
        `);

      if (error) throw error;
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function handleCategorySelect(category: string | null) {
    if (!category) {
      setFilteredItems(items);
    } else {
      setFilteredItems(items.filter(item => item.category === category));
    }
  }

  function handleSearch(query: string) {
    const searchTerm = query.toLowerCase();
    setFilteredItems(
      items.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm)
      )
    );
  }

  function handleAddToCart(item: Item) {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(i => i.id === item.id);
      if (existingItem) {
        return prevItems.map(i =>
          i.id === item.id
            ? { ...i, quantity: Math.min(i.quantity + 1, item.stock) }
            : i
        );
      }
      return [...prevItems, { ...item, quantity: 1 }];
    });
  }

  function handleRemoveFromCart(itemId: string) {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }

  function handleUpdateQuantity(itemId: string, quantity: number) {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { ...item, quantity: Math.min(Math.max(1, quantity), item.stock) }
          : item
      )
    );
  }

  function handleCheckout() {
    // TODO: Implement checkout logic
    console.log('Checkout:', cartItems);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar
        onCategorySelect={handleCategorySelect}
        onSearchChange={handleSearch}
        onCartClick={() => setShowCart(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      </main>

      {showCart && (
        <Cart
          items={cartItems}
          onClose={() => setShowCart(false)}
          onRemoveItem={handleRemoveFromCart}
          onUpdateQuantity={handleUpdateQuantity}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  );
}

export default App;