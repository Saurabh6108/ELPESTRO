import { useEffect, useMemo, useState } from 'react';
import { Plus, Minus, ShoppingCart, X, Search, Clock, CheckCircle2, Loader2, ArrowRight, UtensilsCrossed } from 'lucide-react';
import { supabase, type MenuItem, type CartItem } from '@/lib/supabase';

const CATEGORIES = ['All', 'Starters', 'Mains', 'Desserts', 'Drinks'] as const;

export default function CustomerPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadMenu();
  }, []);

  async function loadMenu() {
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category')
      .order('name');
    if (error) {
      console.error(error);
    } else if (data) {
      setMenu(data as MenuItem[]);
    }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return menu.filter((m) => {
      const matchCat = category === 'All' || m.category === category;
      const matchQuery =
        !query ||
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        (m.description ?? '').toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [menu, category, query]);

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal = cart.reduce((s, c) => s + c.quantity * Number(c.menuItem.price), 0);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItem.id === id ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((c) => c.menuItem.id !== id));
  }

  async function placeOrder(customerName: string, tableNumber: string, notes: string) {
    if (cart.length === 0) return;
    setSubmitting(true);

    const total = cart.reduce((s, c) => s + c.quantity * Number(c.menuItem.price), 0);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customerName,
        table_number: tableNumber || null,
        total,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError || !order) {
      setSubmitting(false);
      throw new Error(orderError?.message ?? 'Failed to create order');
    }

    const items = cart.map((c) => ({
      order_id: order.id,
      menu_item_id: c.menuItem.id,
      name: c.menuItem.name,
      price: c.menuItem.price,
      quantity: c.quantity,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(items);
    setSubmitting(false);

    if (itemsError) throw new Error(itemsError.message);

    setCart([]);
    setCartOpen(false);
    setConfirmation({ id: order.id, name: customerName });
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-md border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => { window.location.hash = ''; }} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5 text-stone-950" />
            </div>
            <span className="font-display text-xl font-bold text-stone-50">Elpestro</span>
          </button>
          <button onClick={() => { window.location.hash = 'owner'; }} className="flex items-center gap-2 px-4 py-2 rounded-full border border-stone-700 text-stone-300 text-sm font-medium hover:border-amber-500 hover:text-amber-400 transition-colors">
            <span className="hidden sm:inline">Owner dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-stone-900">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/5488052/pexels-photo-5488052.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/70 to-stone-900/40" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-2xl animate-slide-up">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold tracking-wider uppercase mb-5">
              <UtensilsCrossed className="w-3.5 h-3.5" /> Fresh Kitchen · Open Now
            </span>
            <h1 className="font-display text-4xl sm:text-6xl font-bold text-stone-50 leading-[1.05] mb-5">
              Good food,<br />
              <span className="text-amber-400">made with soul.</span>
            </h1>
            <p className="text-stone-300 text-lg max-w-md mb-8 leading-relaxed">
              Explore our seasonal menu and place your order in seconds. No queue, no fuss — just great taste.
            </p>
            <a
              href="#menu"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 text-stone-900 font-semibold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
            >
              Browse the menu <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Menu */}
      <section id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold text-stone-900">Our Menu</h2>
            <p className="text-stone-500 mt-1">Crafted fresh, served with care.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes…"
              className="pl-10 pr-4 py-2.5 w-full sm:w-64 rounded-full border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                category === cat
                  ? 'bg-stone-900 text-stone-50 shadow'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-stone-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-stone-400">
            <p>No dishes match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item, i) => (
              <article
                key={item.id}
                className="group bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="relative h-48 overflow-hidden bg-stone-100">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <UtensilsCrossed className="w-10 h-10" />
                    </div>
                  )}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-xs font-medium text-stone-700">
                    {item.category}
                  </span>
                  {!item.available && (
                    <div className="absolute inset-0 bg-stone-900/50 flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-stone-50 text-stone-900 text-xs font-semibold">
                        Unavailable
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-display text-lg font-bold text-stone-900 leading-tight">
                      {item.name}
                    </h3>
                    <span className="font-semibold text-amber-600 whitespace-nowrap">
                      ${Number(item.price).toFixed(2)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-stone-500 leading-relaxed mb-4 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <button
                    onClick={() => addToCart(item)}
                    disabled={!item.available}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-stone-900 text-stone-50 text-sm font-semibold hover:bg-amber-500 hover:text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add to order
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Floating cart bar */}
      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-5 py-3.5 rounded-full bg-amber-500 text-stone-900 font-semibold shadow-2xl shadow-amber-500/30 animate-bounce-in hover:bg-amber-400 transition-colors"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>{cartCount} item{cartCount > 1 ? 's' : ''}</span>
          <span className="w-px h-5 bg-stone-900/20" />
          <span>${cartTotal.toFixed(2)}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          submitting={submitting}
          onClose={() => setCartOpen(false)}
          onUpdateQty={updateQty}
          onRemove={removeItem}
          onPlaceOrder={placeOrder}
        />
      )}

      {/* Confirmation modal */}
      {confirmation && (
        <ConfirmationModal
          confirmation={confirmation}
          onClose={() => setConfirmation(null)}
        />
      )}
    </div>
  );
}

function CartDrawer({
  cart,
  submitting,
  onClose,
  onUpdateQty,
  onRemove,
  onPlaceOrder,
}: {
  cart: CartItem[];
  submitting: boolean;
  onClose: () => void;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onPlaceOrder: (name: string, table: string, notes: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [table, setTable] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const total = cart.reduce((s, c) => s + c.quantity * Number(c.menuItem.price), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setError('');
    try {
      await onPlaceOrder(name.trim(), table.trim(), notes.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-stone-50 h-full flex flex-col animate-slide-in-right shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-white">
          <h2 className="font-display text-xl font-bold text-stone-900">Your Order</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400 px-6">
            <ShoppingCart className="w-12 h-12 mb-3" />
            <p>Your cart is empty.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.map((c) => (
                <div key={c.menuItem.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-stone-100">
                  {c.menuItem.image_url && (
                    <img src={c.menuItem.image_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900 text-sm truncate">{c.menuItem.name}</p>
                    <p className="text-stone-500 text-xs">${Number(c.menuItem.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onUpdateQty(c.menuItem.id, -1)} className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{c.quantity}</span>
                    <button onClick={() => onUpdateQty(c.menuItem.id, 1)} className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onRemove(c.menuItem.id)} className="ml-1 p-1 text-stone-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-stone-200 bg-white px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name *"
                  className="px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
                <input
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                  placeholder="Table no."
                  className="px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
              </div>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (allergies, preferences…)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex items-center justify-between pt-1">
                <span className="text-stone-500 text-sm">Total</span>
                <span className="font-display text-2xl font-bold text-stone-900">${total.toFixed(2)}</span>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-amber-500 text-stone-900 font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Placing order…</>
                ) : (
                  <>Place order <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function ConfirmationModal({
  confirmation,
  onClose,
}: {
  confirmation: { id: string; name: string };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-bounce-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </div>
        <h3 className="font-display text-2xl font-bold text-stone-900 mb-2">Order placed!</h3>
        <p className="text-stone-500 mb-1">
          Thank you, <span className="font-medium text-stone-700">{confirmation.name}</span>.
        </p>
        <p className="text-stone-500 text-sm mb-6">
          Your order is now in the kitchen. We'll have it ready for you shortly.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-stone-400 mb-6">
          <Clock className="w-3.5 h-3.5" />
          Order ref: {confirmation.id.slice(0, 8).toUpperCase()}
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-stone-900 text-stone-50 font-semibold hover:bg-stone-800 transition-colors"
        >
          Continue browsing
        </button>
      </div>
    </div>
  );
}
