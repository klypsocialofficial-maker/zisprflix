import { useState } from 'react';
import { motion } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { deleteUser, User, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';

interface Props {
  user: User;
  profile: any;
  onUpdateProfile: (name: string, avatarUrl: string) => Promise<void>;
}

const AVATAR_URLS = [
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Zispr1&backgroundColor=b6e3f4',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Zispr2&backgroundColor=c0aede',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Zispr3&backgroundColor=ffd5dc',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Zispr4&backgroundColor=d1d4f9',
  'https://api.dicebear.com/9.x/micah/svg?seed=Zispr5&backgroundColor=ffdfbf',
];

export default function SettingsView({ user, profile, onUpdateProfile }: Props) {
  const [activeTab, setActiveTab] = useState<'account' | 'security'>('account');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit Profile State
  const [newName, setNewName] = useState(profile.name);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatarUrl);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Erro ao deletar conta. Talvez você precise autenticar novamente.');
      setLoading(false);
    }
  };

  const handleUpdateAccount = async (type: 'email' | 'password') => {
    setLoading(true);
    setMessage(null);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      if (type === 'email') {
        await updateEmail(user, newEmail);
        setMessage({ text: 'E-mail atualizado com sucesso!', type: 'success' });
      } else {
        await updatePassword(user, newPassword);
        setMessage({ text: 'Senha atualizada com sucesso!', type: 'success' });
      }
    } catch (error) {
      console.error('Error updating account:', error);
      setMessage({ text: 'Erro ao atualizar. Verifique sua senha atual.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
        await onUpdateProfile(newName, selectedAvatar);
        setIsEditingProfile(false);
        setMessage({ text: 'Perfil atualizado com sucesso!', type: 'success' });
    } catch (error) {
        console.error('Error updating profile:', error);
        setMessage({ text: 'Erro ao atualizar perfil.', type: 'error' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="safe-top-padding px-4 sm:px-8 text-white"
    >
      <h1 className="text-3xl font-bold mb-6">Configurações</h1>
      
      <div className="flex gap-4 mb-6 border-b border-zinc-700">
        <button onClick={() => setActiveTab('account')} className={`pb-2 ${activeTab === 'account' ? 'border-b-2 border-white' : 'text-gray-400'}`}>Conta</button>
        <button onClick={() => setActiveTab('security')} className={`pb-2 ${activeTab === 'security' ? 'border-b-2 border-white' : 'text-gray-400'}`}>Segurança</button>
      </div>

      {activeTab === 'account' && (
        <div className="bg-zinc-900 rounded-lg p-6 max-w-lg">
          <h2 className="text-xl font-semibold mb-4">Informações da Conta</h2>
          
          <div className="mb-6 bg-zinc-800 p-4 rounded-lg">
            {isEditingProfile ? (
                 <div className="space-y-4">
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-2 bg-black rounded text-white" placeholder="Nome" />
                    <div className="flex flex-wrap gap-2">
                        {AVATAR_URLS.map(url => (
                            <button key={url} onClick={() => setSelectedAvatar(url)} className={`w-12 h-12 rounded overflow-hidden ${selectedAvatar === url ? 'ring-2 ring-white' : ''}`}>
                                <img src={url} alt="avatar" />
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSaveProfile} disabled={loading} className="bg-blue-600 px-4 py-2 rounded text-sm">Salvar</button>
                        <button onClick={() => setIsEditingProfile(false)} className="bg-zinc-700 px-4 py-2 rounded text-sm">Cancelar</button>
                    </div>
                 </div>
            ) : (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img src={profile.avatarUrl} className="w-12 h-12 rounded" alt={profile.name} />
                        <div>
                            <p className="font-semibold">{profile.name}</p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsEditingProfile(true)} className="text-blue-500 text-sm">Editar</button>
                </div>
            )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-zinc-700">
             <button 
               onClick={() => setShowDeleteModal(true)}
               className="text-red-500 hover:text-red-400 text-sm font-medium"
             >
               Deletar Conta
             </button>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-zinc-900 rounded-lg p-6 max-w-lg">
          <h2 className="text-xl font-semibold mb-4">Segurança</h2>
          {message && <p className={`mb-4 p-2 rounded ${message.type === 'success' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>{message.text}</p>}
          <input type="password" placeholder="Senha Atual (obrigatória)" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full p-2 mb-4 bg-zinc-800 rounded text-white" />
          
          <div className="mb-6">
            <input type="email" placeholder="Novo E-mail" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full p-2 mb-2 bg-zinc-800 rounded text-white" />
            <button onClick={() => handleUpdateAccount('email')} disabled={loading || !newEmail || !currentPassword} className="bg-blue-600 px-4 py-2 rounded text-sm font-medium disabled:opacity-50">Atualizar E-mail</button>
          </div>

          <div>
            <input type="password" placeholder="Nova Senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-2 mb-2 bg-zinc-800 rounded text-white" />
            <button onClick={() => handleUpdateAccount('password')} disabled={loading || !newPassword || !currentPassword} className="bg-blue-600 px-4 py-2 rounded text-sm font-medium disabled:opacity-50">Atualizar Senha</button>
          </div>
        </div>
      )}
      
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-zinc-800 rounded-lg p-6 w-full max-w-sm"
          >
            <h2 className="text-xl font-bold mb-4">Deletar Conta?</h2>
            <p className="text-gray-400 mb-6">Esta ação é permanente. Todos os seus dados serão removidos.</p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-white">Cancelar</button>
              <button 
                onClick={handleDeleteAccount}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                {loading ? 'Deletando...' : 'Confirmar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
