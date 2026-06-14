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
import { LogOut, Home, Search, Tv, Menu, X, Bookmark, Compass, Sparkles, Share, Info } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeProfile, setActiveProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inicio');
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

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

  useEffect(() => {
    // Check if device is iOS and not already running in standalone mode (PWA installed)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    if (isIOS && !isStandalone) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 5000); // 5 seconds delay so the user first appreciates the app transition
      return () => clearTimeout(timer);
    }
  }, [user, activeProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const navButtons = [
    { id: 'inicio', label: 'Início' },
    { id: 'filmes', label: 'Filmes' },
    { id: 'series', label: 'Séries' },
    { id: 'pesquisa', label: 'Pesquisar' },
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
      <div className="min-h-screen bg-black text-gray-100 font-sans flex flex-col">
        {/* Navigation Bar (Desktop & Mobile Header) */}
        <nav className="fixed top-0 left-0 right-0 px-4 sm:px-8 z-50 bg-gradient-to-b from-black/95 via-black/60 to-transparent flex justify-between items-center transition-all safe-navbar-padding">
          <div className="flex items-center gap-8">
            <h1 
              onClick={() => { setActiveTab('inicio'); setSearchQuery(''); }} 
              className="text-3xl font-black text-red-600 tracking-tighter uppercase italic cursor-pointer"
            >
              Zispr
            </h1>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
              {navButtons.map(btn => (
                <button 
                  key={btn.id}
                  onClick={() => { setActiveTab(btn.id); }} 
                  className={`${activeTab === btn.id ? 'text-white font-bold' : 'hover:text-gray-400'} transition-colors duration-200 cursor-pointer`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Desktop Search */}
            <div className="hidden md:flex items-center relative">
              {showSearch && (
                <input 
                  type="text" 
                  placeholder="Títulos..."
                  className="absolute right-8 bg-black/90 border border-white/20 text-white px-4 py-1.5 focus:outline-none w-48 sm:w-64 rounded-full transition-all shadow-xl"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
              )}
              <button onClick={() => setShowSearch(!showSearch)} className="text-white hover:text-red-500 transition-colors z-10 p-1">
                <Search size={22} />
              </button>
            </div>

            {/* User Profile Dropdown */}
            <div className="flex items-center gap-3 cursor-pointer group relative">
              <img 
                src={activeProfile.avatarUrl} 
                alt={activeProfile.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent group-hover:ring-red-600 transition-all duration-300"
              />
              <span className="hidden sm:inline text-sm font-semibold">{activeProfile.name}</span>
              
              {/* Settings Dropdown */}
              <div className="absolute right-0 top-full mt-4 w-56 bg-black/95 border border-white/10 rounded-xl py-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 shadow-2xl backdrop-blur-md">
                <div className="flex flex-col gap-2">
                  <div className="px-4 pb-4 border-b border-white/10">
                    <p className="text-xs text-gray-400">Olá</p>
                    <p className="text-sm font-bold text-white block truncate mt-1">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('configuracoes')}
                    className="text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Configurações
                  </button>
                  <button 
                    onClick={() => {
                      signOut(auth);
                      setActiveProfile(null);
                    }}
                    className="text-left px-4 py-2.5 text-sm text-red-500 hover:text-red-400 hover:bg-white/10 transition-colors"
                  >
                    Sair da Conta
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="w-full flex-1 flex flex-col safe-bottom-padding">
          {activeTab === 'configuracoes' || activeTab === 'configuracoes_mobile' ? (
            <SettingsView user={user} profile={activeProfile} onUpdateProfile={handleUpdateProfile} />
          ) : (
            <Catalog 
              activeTab={activeTab === 'pesquisa_mobile' ? 'pesquisa' : activeTab} 
              searchQuery={searchQuery} 
              user={user} 
              profileId={activeProfile.id} 
              onSearchQueryChange={setSearchQuery}
            />
          )}
        </main>

        {/* iOS Install Guide Banner */}
        {showInstallPrompt && (
          <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:max-w-md z-[90] bg-zinc-950/95 border border-white/10 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 backdrop-blur-xl animate-bounce-short">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-red-600/20 text-red-500 rounded-lg">
                  <Sparkles size={18} />
                </span>
                <h4 className="text-sm font-extrabold text-white">Instalar o Zispr</h4>
              </div>
              <button 
                onClick={() => setShowInstallPrompt(false)} 
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <p className="text-xs text-zinc-300 leading-relaxed leading-normal">
              Para ter a melhor experiência de <strong>App Nativo (Tela Cheia)</strong> no seu iPhone ou iPad:
            </p>
            
            <div className="flex items-center gap-3 bg-zinc-900/80 p-2.5 rounded-xl border border-white/5 text-xs text-zinc-200 font-semibold">
              <Share className="text-blue-500 shrink-0" size={18} />
              <span>Toque em "Compartilhar" e selecione "Adicionar à Tela de Início"</span>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar for Mobile Devices */}
        <div 
          className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 border-t border-white/10 z-[80] select-none shadow-[0_-10px_30px_rgba(0,0,0,0.8)] backdrop-blur-lg" 
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)', paddingTop: '8px' }}
        >
          <div className="flex justify-around items-center w-full max-w-lg mx-auto px-4">
            <button 
              onClick={() => { setActiveTab('inicio'); setSearchQuery(''); }}
              className={`flex flex-col items-center gap-1 py-1 transition-all duration-200 outline-none ${activeTab === 'inicio' ? 'text-red-500 scale-105' : 'text-zinc-400 hover:text-zinc-300'}`}
            >
              <Home size={22} className={activeTab === 'inicio' ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
              <span className="text-[10px] font-bold">Início</span>
            </button>

            <button 
              onClick={() => { setActiveTab('filmes'); setSearchQuery(''); }}
              className={`flex flex-col items-center gap-1 py-1 transition-all duration-200 outline-none ${activeTab === 'filmes' ? 'text-red-500 scale-105' : 'text-zinc-400 hover:text-zinc-300'}`}
            >
              <Tv size={22} className={activeTab === 'filmes' ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
              <span className="text-[10px] font-bold">Filmes</span>
            </button>

            <button 
              onClick={() => { setActiveTab('pesquisa'); }}
              className={`flex flex-col items-center gap-1 py-1 transition-all duration-200 outline-none ${activeTab === 'pesquisa' ? 'text-red-500 scale-105' : 'text-zinc-400 hover:text-zinc-300'}`}
            >
              <Search size={22} className={activeTab === 'pesquisa' ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
              <span className="text-[10px] font-bold">Pesquisa</span>
            </button>

            <button 
              onClick={() => { setActiveTab('minhaLista'); setSearchQuery(''); }}
              className={`flex flex-col items-center gap-1 py-1 transition-all duration-200 outline-none ${activeTab === 'minhaLista' ? 'text-red-500 scale-105' : 'text-zinc-400 hover:text-zinc-300'}`}
            >
              <Bookmark size={22} className={activeTab === 'minhaLista' ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
              <span className="text-[10px] font-bold">Minha Lista</span>
            </button>

            <button 
              onClick={() => { setActiveTab('configuracoes_mobile'); }}
              className={`flex flex-col items-center gap-1 py-1 transition-all duration-200 outline-none ${activeTab === 'configuracoes_mobile' ? 'text-red-500 scale-105' : 'text-zinc-400 hover:text-zinc-300'}`}
            >
              <img 
                src={activeProfile.avatarUrl} 
                alt={activeProfile.name}
                className={`w-6 h-6 rounded-full object-cover border-2 transition-all duration-200 ${activeTab === 'configuracoes_mobile' ? 'border-red-500 scale-105 shadow-md shadow-red-500/20' : 'border-zinc-500'}`}
              />
              <span className="text-[10px] font-bold">Menu</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Auth />;
}
