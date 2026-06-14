/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import Auth from './components/Auth';
import ProfileSelection from './components/ProfileSelection';
import Catalog from './components/Catalog';
import SettingsView from './components/SettingsView';
import { auth, db } from './lib/firebase';
import { updateDoc, doc } from 'firebase/firestore';
import { LogOut, Home, Search, Tv, Menu, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeProfile, setActiveProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inicio');
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setActiveProfile(null); // Reset profile on logout
      }
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

  const navButtons = [
    { id: 'inicio', label: 'Início' },
    { id: 'series', label: 'Séries' },
    { id: 'filmes', label: 'Filmes' },
    { id: 'classicos', label: 'Clássicos' },
    { id: 'bombando', label: 'Bombando' },
    { id: 'minhaLista', label: 'Minha Lista' },
  ];

  const handleUpdateProfile = async (name: string, avatarUrl: string) => {
    await updateDoc(doc(db, 'users', user.uid, 'profiles', activeProfile.id), {
      name,
      avatarUrl
    });
    setActiveProfile({ ...activeProfile, name, avatarUrl });
  };

  if (user) {
    if (!activeProfile) {
      return <ProfileSelection user={user} onSelectProfile={setActiveProfile} />;
    }

    return (
      <div className="min-h-screen bg-black text-gray-100 font-sans">
        {/* Navigation Bar */}
        <nav className="fixed top-0 left-0 right-0 px-4 sm:px-8 py-4 z-50 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center transition-colors hover:bg-black/80">
          <div className="flex items-center gap-8">
            <h1 className="text-3xl font-black text-red-600 tracking-tighter uppercase italic">Zispr</h1>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
              {navButtons.map(btn => (
                <button 
                  key={btn.id}
                  onClick={() => { setActiveTab(btn.id); setShowMobileMenu(false); }} 
                  className={`${activeTab === btn.id ? 'text-white font-bold' : 'hover:text-gray-400'} transition-colors`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            
            {/* Mobile Menu Toggle */}
            <button className="md:hidden text-white" onClick={() => setShowMobileMenu(!showMobileMenu)}>
              {showMobileMenu ? <X /> : <Menu />}
            </button>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative flex items-center">
              {showSearch && (
                <input 
                  type="text" 
                  placeholder="Títulos..."
                  className="absolute right-8 bg-black/80 border border-white/20 text-white px-4 py-1.5 focus:outline-none w-48 sm:w-64 rounded-sm transition-all shadow-xl"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
              )}
              <button onClick={() => setShowSearch(!showSearch)} className="text-white hover:text-gray-300 transition-colors z-10">
                <Search size={22} />
              </button>
            </div>
            <div className="flex items-center gap-3 cursor-pointer group relative">
              <img 
                src={activeProfile.avatarUrl} 
                alt={activeProfile.name}
                className="w-8 h-8 rounded object-cover"
              />
              {/* Settings Dropdown */}
              <div className="absolute right-0 top-full mt-4 w-56 bg-black/90 border border-white/10 rounded-md py-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="flex flex-col gap-2">
                  <div className="px-4 pb-4 border-b border-white/10">
                    <p className="text-sm text-gray-400">Olá</p>
                    <p className="text-xs text-white block truncate mt-1">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('configuracoes')}
                    className="text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Configurações
                  </button>
                  <button 
                    onClick={() => {
                      signOut(auth);
                      setActiveProfile(null);
                    }}
                    className="text-left px-4 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-white/10 transition-colors"
                  >
                    Sair da Conta
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="fixed inset-0 z-40 bg-black pt-24 px-4">
            {navButtons.map(btn => (
              <button
                key={btn.id}
                onClick={() => { setActiveTab(btn.id); setShowMobileMenu(false); }}
                className="block w-full text-left py-4 text-xl font-medium border-b border-white/10"
              >
                {btn.label}
              </button>
            ))}
            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="text-sm font-bold text-gray-300 mb-4">Minha Conta</p>
              <p className="text-xs text-gray-500 mb-4">{user.email}</p>
              <button
                onClick={() => { setActiveTab('configuracoes'); setShowMobileMenu(false); }}
                className="block w-full text-left py-4 text-lg text-gray-300"
              >
                Configurações
              </button>
              <button
                onClick={() => {
                  signOut(auth);
                  setActiveProfile(null);
                  setShowMobileMenu(false);
                }}
                className="block w-full text-left py-4 text-lg text-red-500"
              >
                Sair da Conta
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="w-full">
          {activeTab === 'configuracoes' ? (
            <SettingsView user={user} profile={activeProfile} onUpdateProfile={handleUpdateProfile} />
          ) : (
            <Catalog activeTab={activeTab} searchQuery={searchQuery} user={user} profileId={activeProfile.id} />
          )}
        </main>
      </div>
    );
  }

  return <Auth />;
}
