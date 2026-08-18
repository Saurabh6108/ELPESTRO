import { useEffect, useState } from 'react';
import CustomerPage from '@/components/CustomerPage';
import LandingPage from '@/components/LandingPage';
import OwnerPage from '@/components/OwnerPage';

type View = 'landing' | 'customer' | 'owner';

export default function App() {
  const [view, setView] = useState<View>('customer');

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace('#', '');
      setView(hash === 'owner' ? 'owner' : hash === 'customer' ? 'customer' : 'landing');
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  if (view === 'owner') return <OwnerPage />;
  if (view === 'customer') return <CustomerPage />;
  return <LandingPage />;
}
