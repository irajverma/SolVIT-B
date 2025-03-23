import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addMinutes, setHours, setMinutes } from 'date-fns';
import { useCartStore, useUserStore } from '../lib/store';
import { supabase } from '../lib/supabase';

export function CheckoutPage() {
  const navigate = useNavigate();
  const cartItems = useCartStore(state => state.items);
  const clearCart = useCartStore(state => state.clearCart);
  const user = useUserStore(state => state.user);
  
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const totalAmount = cartItems.reduce((sum, item) => sum + item.cost * item.quantity, 0);

  const getAvailableSlots = React.useCallback((date: Date) => {
    const slots = [];
    let currentTime = setHours(setMinutes(date, 0), 9); // Start at 9 AM
    const endTime = setHours(setMinutes(date, 0), 21); // End at 9 PM

    while (currentTime <= endTime) {
      slots.push({
        time: format(currentTime, 'HH:mm'),
        available: Math.floor(Math.random() * 3) > 0 // Random availability
      });
      currentTime = addMinutes(currentTime, 30);
    }

    return slots;
  }, []);

  const handleCheckout = async () => {
    if (!selectedSlot || !user) return;

    setLoading(true);
    setError(null);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: totalAmount,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create queue token
      const slotTime = new Date(selectedDate);
      const [hours, minutes] = selectedSlot.split(':');
      slotTime.setHours(parseInt(hours), parseInt(minutes));

      const { data: token, error: tokenError } = await supabase
        .from('queue_tokens')
        .insert({
          user_id: user.id,
          token_number: Math.floor(Math.random() * 1000) + 1,
          slot_time: slotTime.toISOString(),
          expires_at: new Date(slotTime.getTime() + 15 * 60000).toISOString()
        })
        .select()
        .single();

      if (tokenError) throw tokenError;

      // Update order with token
      const { error: updateError } = await supabase
        .from('orders')
        .update({ queue_token_id: token.id })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // Clear cart and show success
      clearCart();
      alert(`Order placed successfully! Your token number is: ${token.token_number}`);
      navigate('/retail');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process checkout');
    } finally {
      setLoading(false);
    }
  };

  const slots = React.useMemo(() => getAvailableSlots(selectedDate), [selectedDate, getAvailableSlots]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-md mb-6">
              {error}
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Select Time Slot</h2>
            <div className="grid grid-cols-3 gap-4">
              {slots.map(({ time, available }) => (
                <button
                  key={time}
                  onClick={() => setSelectedSlot(time)}
                  disabled={!available}
                  className={`p-3 rounded-md text-center ${
                    selectedSlot === time
                      ? 'bg-indigo-600 text-white'
                      : available
                      ? 'bg-gray-100 hover:bg-gray-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.name} x {item.quantity}</span>
                  <span>₹{(item.cost * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-4 font-semibold">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || !selectedSlot}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Complete Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}