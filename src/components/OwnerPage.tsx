import { useEffect, useRef, useState } from 'react';
import {
  Bell, Clock, CheckCircle2, ChefHat, XCircle, Loader2, UtensilsCrossed,
  TrendingUp, Package, ArrowRight, Volume2, VolumeX, Plus, X, Trash2, Eye, EyeOff,
} from 'lucide-react';
import { supabase, type MenuItem, type Order, type OrderItem, type OrderStatus } from '@/lib/supabase';

type OrderWithItems = Order & { order_items: OrderItem[] };

const STATUS_FLOW: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed'];
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'New',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_STYLES: Record<OrderStatus, { bg: string; text: string; dot: string; ring: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', ring: 'ring-amber-500/30' },
  preparing: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', ring: 'ring-blue-500/30' },
  ready: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', ring: 'ring-green-500/30' },
  completed: { bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-400', ring: 'ring-stone-300' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', ring: 'ring-red-500/30' },
};

export default function OwnerPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus>('pending');
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [soundOn, setSoundOn] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [section, setSection] = useState<'orders' | 'menu'>('orders');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());
  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    loadOrders();
    loadMenuItems();
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const newOrder = payload.new as Order;
        if (!knownIds.current.has(newOrder.id)) {
          knownIds.current.add(newOrder.id);
          setNewOrderIds((prev) => new Set(prev).add(newOrder.id));
          if (soundOn) playAlert();
        }
        loadOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        loadOrders();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, () => {
        loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn]);

  function playAlert() {
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtx.current;
      const now = ctx.currentTime;
      // Two-tone chime
      [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const start = now + i * 0.18;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch {
      // audio not available
    }
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
    } else if (data) {
      const typed = data as OrderWithItems[];
      setOrders(typed);
      typed.forEach((o) => knownIds.current.add(o.id));
    }
    setLoading(false);
  }

  async function updateStatus(id: string, status: OrderStatus) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);
    if (error) {
      console.error(error);
      loadOrders();
    }
  }

  async function addMenuItem(item: {
    name: string;
    description: string;
    price: number;
    category: string;
    image_url: string;
  }) {
    const { error } = await supabase.from('menu_items').insert({
      ...item,
      available: true,
    });
    if (error) throw new Error(error.message);
    await loadMenuItems();
  }

  async function loadMenuItems() {
    setMenuLoading(true);
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
    } else if (data) {
      setMenuItems(data as MenuItem[]);
    }
    setMenuLoading(false);
  }

  async function toggleAvailability(item: MenuItem) {
    setMenuItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, available: !m.available } : m))
    );
    const { error } = await supabase
      .from('menu_items')
      .update({ available: !item.available })
      .eq('id', item.id);
    if (error) {
      console.error(error);
      loadMenuItems();
    }
  }

  async function deleteMenuItem(id: string) {
    setMenuItems((prev) => prev.filter((m) => m.id !== id));
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) {
      console.error(error);
      loadMenuItems();
    }
  }

  const counts = {
    pending: orders.filter((o) => o.status === 'pending').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready: orders.filter((o) => o.status === 'ready').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  const tabOrders = orders.filter((o) => o.status === activeTab);
  const todayRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + Number(o.total), 0);

  function dismissNew(id: string) {
    setNewOrderIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-md border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => { window.location.hash = ''; }} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5 text-stone-950" />
            </div>
            <span className="font-display text-xl font-bold text-stone-50">Elpestro</span>
          </button>
          <button onClick={() => { window.location.hash = 'customer'; }} className="flex items-center gap-2 px-4 py-2 rounded-full border border-stone-700 text-stone-300 text-sm font-medium hover:border-amber-500 hover:text-amber-400 transition-colors">
            <span className="hidden sm:inline">Customer ordering page</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900">Owner Dashboard</h1>
          <p className="text-stone-500 mt-1">Live orders from your kitchen, in real time.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-500 text-stone-900 text-sm font-semibold hover:bg-amber-400 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add menu item
          </button>
          <div className="flex items-center bg-white border border-stone-200 rounded-full p-1">
            <button
              onClick={() => setSection('orders')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${section === 'orders' ? 'bg-stone-900 text-stone-50' : 'text-stone-500 hover:text-stone-700'}`}
            >Orders</button>
            <button
              onClick={() => setSection('menu')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${section === 'menu' ? 'bg-stone-900 text-stone-50' : 'text-stone-500 hover:text-stone-700'}`}
            >Menu</button>
          </div>
          <button
            onClick={() => setSoundOn((s) => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-stone-200 text-sm font-medium hover:border-stone-300 transition-colors"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-amber-500" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
            <span className="hidden sm:inline">{soundOn ? 'Alerts on' : 'Alerts muted'}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      {section === 'orders' && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Bell} label="New Orders" value={counts.pending} accent="amber" pulse={counts.pending > 0} />
        <StatCard icon={ChefHat} label="Preparing" value={counts.preparing} accent="blue" />
        <StatCard icon={CheckCircle2} label="Ready" value={counts.ready} accent="green" />
        <StatCard icon={TrendingUp} label="Revenue Today" value={`${todayRevenue.toFixed(2)}`} accent="stone" />
      </div>
      )}

      {/* Tabs */}
      {section === 'orders' && (
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-6">
        {(['pending', 'preparing', 'ready', 'completed', 'cancelled'] as OrderStatus[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-stone-900 text-stone-50 shadow'
                : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
            }`}
          >
            {STATUS_LABELS[tab]}
            {counts[tab] > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab ? 'bg-amber-500 text-stone-900' : 'bg-stone-100 text-stone-600'}`}>
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>
      )}

      {/* Orders */}
      {section === 'orders' && (loading ? (
        <div className="flex items-center justify-center py-24 text-stone-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : tabOrders.length === 0 ? (
        <div className="text-center py-24 text-stone-400">
          <Package className="w-12 h-12 mx-auto mb-3" />
          <p>No {STATUS_LABELS[activeTab].toLowerCase()} orders right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {tabOrders.map((order, i) => {
            const isNew = newOrderIds.has(order.id);
            const style = STATUS_STYLES[order.status];
            return (
              <article
                key={order.id}
                className={`relative bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden animate-slide-up ring-2 ${isNew ? style.ring : 'ring-transparent'}`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {isNew && (
                  <div className="absolute top-0 right-0 flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-stone-900 text-xs font-bold rounded-bl-xl">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stone-900 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-stone-900" />
                    </span>
                    NEW
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-display text-lg font-bold text-stone-900">{order.customer_name}</h3>
                      <div className="flex items-center gap-3 text-xs text-stone-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(order.created_at)}
                        </span>
                        {order.table_number && (
                          <span>Table {order.table_number}</span>
                        )}
                        <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text} flex items-center gap-1.5`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 mb-4">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600">
                            {item.quantity}
                          </span>
                          <span className="text-stone-700">{item.name}</span>
                        </span>
                        <span className="text-stone-500">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-800">
                      <span className="font-medium">Note:</span> {order.notes}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                    <span className="font-display text-lg font-bold text-stone-900">
                      ${Number(order.total).toFixed(2)}
                    </span>
                    {isNew && (
                      <button
                        onClick={() => dismissNew(order.id)}
                        className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        Dismiss alert
                      </button>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => { updateStatus(order.id, 'preparing'); dismissNew(order.id); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
                        >
                          <ChefHat className="w-4 h-4" /> Start preparing
                        </button>
                        <button
                          onClick={() => updateStatus(order.id, 'cancelled')}
                          className="px-3 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => updateStatus(order.id, 'ready')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Mark as ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => updateStatus(order.id, 'completed')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-stone-900 text-stone-50 text-sm font-semibold hover:bg-stone-800 transition-colors"
                      >
                        <UtensilsCrossed className="w-4 h-4" /> Complete & serve
                      </button>
                    )}
                    {(order.status === 'completed' || order.status === 'cancelled') && (
                      <span className="text-sm text-stone-400 py-2.5">No further action needed</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ))}

      {section === 'menu' && (
        <MenuManager
          items={menuItems}
          loading={menuLoading}
          onToggle={toggleAvailability}
          onDelete={deleteMenuItem}
          onAdd={() => setMenuOpen(true)}
        />
      )}

      {menuOpen && (
        <AddMenuItemModal
          onClose={() => setMenuOpen(false)}
          onSave={addMenuItem}
        />
      )}
      </div>
    </div>
  );
}

function AddMenuItemModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (item: { name: string; description: string; price: number; category: string; image_url: string }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Mains');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericPrice = Number(price);
    if (!name.trim() || !description.trim() || !price || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError('Add a name, description, and a valid price.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        price: numericPrice,
        category,
        image_url: imageUrl.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this menu item.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-bounce-in overflow-hidden">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-stone-900">Add menu item</h2>
            <p className="text-sm text-stone-500 mt-1">Make a new dish available to customers.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Dish name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Truffle Mushroom Toast" className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Description</label>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell customers what makes it delicious…" rows={3} className="w-full resize-none px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Price</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                <input type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="12.00" className="w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Category</label>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500">
                <option>Starters</option>
                <option>Mains</option>
                <option>Desserts</option>
                <option>Drinks</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Food photo URL <span className="font-normal text-stone-400">(optional)</span></label>
            <input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="flex gap-3 border-t border-stone-100 bg-stone-50 px-6 py-4">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-stone-200 bg-white text-stone-700 text-sm font-semibold hover:bg-stone-100 transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 text-stone-900 text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> Add item</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function MenuManager({
  items,
  loading,
  onToggle,
  onDelete,
  onAdd,
}: {
  items: MenuItem[];
  loading: boolean;
  onToggle: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-stone-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-24">
        <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-stone-300" />
        <p className="text-stone-400 mb-4">No menu items yet.</p>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 text-stone-900 text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add your first item
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((item) => (
        <article
          key={item.id}
          className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity ${item.available ? 'border-stone-100' : 'border-stone-200 opacity-60'}`}
        >
          {item.image_url ? (
            <div className="aspect-[4/3] overflow-hidden bg-stone-100">
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="aspect-[4/3] bg-stone-100 flex items-center justify-center">
              <UtensilsCrossed className="w-10 h-10 text-stone-300" />
            </div>
          )}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <h3 className="font-display text-lg font-bold text-stone-900">{item.name}</h3>
                <span className="text-xs text-stone-400">{item.category}</span>
              </div>
              <span className="font-display text-lg font-bold text-stone-900">${Number(item.price).toFixed(2)}</span>
            </div>
            {item.description && (
              <p className="text-sm text-stone-500 line-clamp-2 mb-3">{item.description}</p>
            )}
            <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => onToggle(item)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  item.available
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {item.available ? <><Eye className="w-4 h-4" /> Available</> : <><EyeOff className="w-4 h-4" /> Hidden</>}
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  pulse,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent: 'amber' | 'blue' | 'green' | 'stone';
  pulse?: boolean;
}) {
  const accents = {
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    stone: 'bg-stone-100 text-stone-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center ${accents[accent]}`}>
          {pulse && <span className="absolute inset-0 rounded-xl animate-pulse-ring bg-amber-500" />}
          <Icon className="w-5 h-5 relative" />
        </div>
        <div>
          <p className="text-stone-400 text-xs font-medium">{label}</p>
          <p className="font-display text-2xl font-bold text-stone-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
