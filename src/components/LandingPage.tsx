import { ArrowRight, ChefHat, Clock3, ShieldCheck, Sparkles, UtensilsCrossed } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-50 overflow-hidden">
      <section className="relative min-h-screen flex items-center">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&h=1600&w=2400"
            alt="Elpestro dining table"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/85 to-stone-950/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-stone-950/50" />
        </div>

        <div className="relative w-full max-w-7xl mx-auto px-6 py-12 sm:py-16">
          <header className="flex items-center justify-between mb-24 sm:mb-32">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <UtensilsCrossed className="w-6 h-6 text-stone-950" />
              </div>
              <span className="font-display text-2xl font-bold tracking-tight">Elpestro</span>
            </div>
            <span className="hidden sm:flex items-center gap-2 text-sm text-stone-300">
              <Sparkles className="w-4 h-4 text-amber-400" /> Cafe & Kitchen
            </span>
          </header>

          <div className="max-w-2xl animate-slide-up">
            <p className="text-amber-400 text-sm font-semibold uppercase tracking-[0.24em] mb-5">Welcome to Elpestro</p>
            <h1 className="font-display text-5xl sm:text-7xl font-bold leading-[1.02] tracking-tight mb-6">
              A table full of<br /><span className="text-amber-400">good moments.</span>
            </h1>
            <p className="text-lg sm:text-xl text-stone-300 leading-relaxed max-w-xl mb-10">
              Fresh ingredients, warm plates, and a menu made for lingering. Choose your experience to get started.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
              <button
                onClick={() => { window.location.hash = 'customer'; }}
                className="group text-left rounded-2xl bg-amber-500 text-stone-950 p-5 hover:bg-amber-400 transition-all hover:-translate-y-1 shadow-xl shadow-amber-900/20"
              >
                <div className="flex items-start justify-between mb-7">
                  <div className="w-11 h-11 rounded-xl bg-stone-950/10 flex items-center justify-center">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="font-display text-2xl font-bold mb-1">Order food</p>
                <p className="text-sm text-stone-800/75">Browse the menu and order from your table.</p>
              </button>

              <button
                onClick={() => { window.location.hash = 'owner'; }}
                className="group text-left rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-5 hover:bg-white/15 transition-all hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-7">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-stone-300 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="font-display text-2xl font-bold mb-1">Owner dashboard</p>
                <p className="text-sm text-stone-300">Manage orders and your live menu.</p>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 sm:gap-8 mt-16 text-sm text-stone-400">
            <span className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-amber-400" /> Open daily</span>
            <span className="flex items-center gap-2"><ChefHat className="w-4 h-4 text-amber-400" /> Made fresh</span>
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-amber-400" /> Easy ordering</span>
          </div>
        </div>
      </section>
    </main>
  );
}
