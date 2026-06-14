import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'motion/react';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  avatarUrl: string;
}

interface ProfileSelectionProps {
  user: User;
  onSelectProfile: (profile: Profile) => void;
}

const AVATAR_URLS = [
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Zispr1&backgroundColor=b6e3f4',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Zispr2&backgroundColor=c0aede',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Zispr3&backgroundColor=ffd5dc',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Zispr4&backgroundColor=d1d4f9',
  'https://api.dicebear.com/9.x/micah/svg?seed=Zispr5&backgroundColor=ffdfbf',
];

export default function ProfileSelection({ user, onSelectProfile }: ProfileSelectionProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  
  // Create / Edit Form State
  const [newName, setNewName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_URLS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'profiles'),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedProfiles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Profile[];
      
      setProfiles(loadedProfiles);
      setLoading(false);
    }, (error) => {
      console.error("Firestore listening error: ", error);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    setIsSubmitting(true);
    try {
      if (editingProfile) {
        await updateDoc(doc(db, 'users', user.uid, 'profiles', editingProfile.id), {
          name: newName.trim(),
          avatarUrl: selectedAvatar,
        });
        setEditingProfile(null);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'profiles'), {
          name: newName.trim(),
          avatarUrl: selectedAvatar,
          createdAt: serverTimestamp()
        });
        setIsCreating(false);
      }
      setNewName('');
      setSelectedAvatar(AVATAR_URLS[0]);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!editingProfile) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'profiles', editingProfile.id));
      setEditingProfile(null);
      setIsCreating(false);
      setNewName('');
      setSelectedAvatar(AVATAR_URLS[0]);
      if (profiles.length <= 1) {
        setIsManaging(false);
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600"></div>
      </div>
    );
  }

  if (isCreating || editingProfile || (profiles.length === 0 && !loading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-8 text-center uppercase tracking-tight">
            {editingProfile ? 'Editar Perfil' : 'Adicionar Perfil'}
          </h1>
          
          <form onSubmit={handleSaveProfile} className="bg-zinc-900/50 p-8 rounded-xl border border-white/10">
            <div className="flex flex-col sm:flex-row gap-8 items-center mb-8">
              <div className="flex-shrink-0 relative">
                <img 
                  src={selectedAvatar} 
                  alt="Profile Avatar" 
                  className="w-32 h-32 rounded-md object-cover border-4 border-transparent"
                />
              </div>
              <div className="flex-grow w-full">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome"
                  className="w-full h-16 px-4 text-xl text-white bg-black/60 border border-white/30 rounded-lg focus:border-red-600 focus:outline-none transition-colors placeholder-gray-500"
                  required
                  maxLength={50}
                />
              </div>
            </div>
            
            <div className="mb-10">
              <p className="text-gray-400 mb-4 font-medium uppercase text-sm tracking-wider">Escolha um avatar:</p>
              <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                {AVATAR_URLS.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setSelectedAvatar(url)}
                    className={`relative rounded-md overflow-hidden outline-none ${selectedAvatar === url ? 'ring-4 ring-white' : 'opacity-50 hover:opacity-80 transition-opacity'}`}
                  >
                    <img src={url} alt="Avatar option" className="w-16 h-16 object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 border-t border-white/10 pt-8 flex-wrap">
              <button
                type="submit"
                disabled={isSubmitting || !newName.trim()}
                className="bg-white hover:bg-gray-200 text-black font-bold uppercase tracking-widest px-8 py-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
              
              {profiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingProfile(null);
                    setNewName('');
                    setSelectedAvatar(AVATAR_URLS[0]);
                  }}
                  className="bg-transparent border border-white/40 hover:border-white text-white font-bold uppercase tracking-widest px-8 py-3 rounded-md transition-colors"
                >
                  Cancelar
                </button>
              )}

              {editingProfile && profiles.length > 1 && (
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  disabled={isDeleting}
                  className="ml-auto bg-transparent border border-red-600/40 hover:border-red-600 text-red-500 font-bold uppercase tracking-widest px-8 py-3 rounded-md transition-colors flex items-center gap-2"
                >
                  <Trash2 size={20} />
                  {isDeleting ? 'Excluindo...' : 'Excluir Perfil'}
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black p-4">
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
        <h1 className="text-4xl sm:text-6xl font-black text-white mb-12 text-center uppercase tracking-tight">
          {isManaging ? 'Gerenciar perfis:' : 'Quem está assistindo?'}
        </h1>
        
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
          {profiles.map((profile) => (
            <motion.div
              key={profile.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center group cursor-pointer relative"
              onClick={() => {
                if (isManaging) {
                  setEditingProfile(profile);
                  setNewName(profile.name);
                  setSelectedAvatar(profile.avatarUrl);
                } else {
                  onSelectProfile(profile);
                }
              }}
            >
              <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-md overflow-hidden border-4 border-transparent group-hover:border-white transition-colors duration-300 shadow-xl mb-4 relative">
                <img 
                  src={profile.avatarUrl} 
                  alt={profile.name} 
                  className={`w-full h-full object-cover transition-opacity ${isManaging ? 'opacity-50' : 'opacity-100'}`}
                />
                {isManaging && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Pencil className="w-10 h-10 text-white" />
                  </div>
                )}
              </div>
              <span className={`text-lg sm:text-xl font-medium transition-colors ${isManaging ? 'text-gray-400' : 'text-gray-400 group-hover:text-white'}`}>
                {profile.name}
              </span>
            </motion.div>
          ))}

          {profiles.length < 5 && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center group cursor-pointer"
              onClick={() => {
                setIsCreating(true);
                setNewName('');
                setSelectedAvatar(AVATAR_URLS[0]);
              }}
            >
              <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-md border-4 border-transparent group-hover:border-white transition-colors duration-300 shadow-xl mb-4 flex items-center justify-center bg-zinc-800">
                <PlusCircle className="w-12 h-12 text-gray-400 group-hover:text-white transition-colors" />
              </div>
              <span className="text-gray-400 group-hover:text-white text-lg sm:text-xl font-medium transition-colors">
                Adicionar Perfil
              </span>
            </motion.div>
          )}
        </div>
        
        <div className="mt-20 flex gap-4">
          <button 
            onClick={() => setIsManaging(!isManaging)}
            className={`${isManaging ? 'bg-white text-black hover:bg-gray-200 border-white' : 'bg-transparent border-gray-500 hover:border-white hover:text-white text-gray-500'} font-bold uppercase tracking-widest px-8 py-2 rounded transition-colors duration-300 border`}
          >
            {isManaging ? 'Concluído' : 'Gerenciar Perfis'}
          </button>
        </div>
      </div>
    </div>
  );
}
