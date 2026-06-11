/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import Auth from './components/Auth';
import { auth } from './lib/firebase';
import { LogOut } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-black text-gray-100 font-sans p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h1 className="text-4xl font-black text-red-600 tracking-tighter uppercase italic">Zispr</h1>
            <button 
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
          
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">Bem-vindo(a)!</h2>
            <p className="text-gray-400 mb-2">Você está logado como: <span className="text-white">{user.email}</span></p>
            <p className="text-gray-400">ID na plataforma: <span className="font-mono text-xs">{user.uid}</span></p>
          </div>
        </div>
      </div>
    );
  }

  return <Auth />;
}
