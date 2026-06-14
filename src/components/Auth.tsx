import { useState } from 'react';
import { Play, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        // Successful login
        console.log('Logged in successfully');
      } else {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Save user profile to Firestore database
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          createdAt: serverTimestamp()
        });
        
        console.log('Account created and saved to database successfully');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Credenciais inválidas.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative w-full items-center justify-center bg-black text-gray-100 font-sans overflow-hidden">
      {/* Dark Overlay for background */}
      <div className="absolute inset-0 opacity-40 pointer-events-none z-0">
        <div className="absolute inset-0" style={{background: 'radial-gradient(circle at 20% 35%, #e11d48 0%, transparent 40%), radial-gradient(circle at 80% 65%, #4c1d95 0%, transparent 40%)', filter: 'blur(80px)'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none">
          <span className="text-[32rem] sm:text-[40rem] font-black tracking-tighter text-white opacity-5">Z</span>
        </div>
      </div>
      
      {/* Header / Logo */}
      <div className="absolute top-0 left-0 p-6 sm:p-12 z-10 w-full flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="max-w-7xl flex items-center gap-2">
          <span className="text-4xl font-black text-red-600 tracking-tighter uppercase italic">Zispr</span>
        </div>
      </div>

      {/* Auth Container */}
      <div className="z-10 w-full sm:w-[500px] p-8 sm:p-16 rounded-md mt-24 sm:mt-0 min-h-[500px]">
        <h1 className="text-5xl font-black uppercase tracking-tight mb-10 text-white">
          {isLogin ? 'Entrar' : 'Criar Conta'}
        </h1>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <div className="bg-red-600/20 border border-red-600 text-red-500 px-4 py-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <div className="relative">
            <input 
              type="email" 
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full h-16 px-4 pt-5 pb-1 text-white bg-black/60 border border-white/30 rounded-lg focus:border-red-600 focus:outline-none focus:ring-0 peer transition-all placeholder-transparent"
              placeholder="Endereço de email"
              required
            />
            <label 
              htmlFor="email"
              className="absolute text-gray-400 uppercase tracking-widest text-xs transition-all left-4 top-2 peer-placeholder-shown:text-base peer-placeholder-shown:top-5 peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-xs peer-focus:uppercase peer-focus:tracking-widest"
            >
              Email
            </label>
          </div>

          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full h-16 px-4 pt-5 pb-1 text-white bg-black/60 border border-white/30 rounded-lg focus:border-red-600 focus:outline-none focus:ring-0 peer transition-all placeholder-transparent pr-12"
              placeholder="Senha"
              required
            />
            <label 
              htmlFor="password"
              className="absolute text-gray-400 uppercase tracking-widest text-xs transition-all left-4 top-2 peer-placeholder-shown:text-base peer-placeholder-shown:top-5 peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-xs peer-focus:uppercase peer-focus:tracking-widest"
            >
              Senha
            </label>
            <button 
              type="button"
              className="absolute right-4 top-5 text-gray-400 hover:text-white transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
            </button>
          </div>

          <AnimatePresence>
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative overflow-hidden"
              >
                <input 
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full h-16 px-4 pt-5 pb-1 text-white bg-black/60 border border-white/30 rounded-lg focus:border-red-600 focus:outline-none focus:ring-0 peer transition-all placeholder-transparent"
                  placeholder="Confirmar Senha"
                  required
                />
                <label 
                  htmlFor="confirm-password"
                  className="absolute text-gray-400 uppercase tracking-widest text-xs transition-all left-4 top-2 peer-placeholder-shown:text-base peer-placeholder-shown:top-5 peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-xs peer-focus:uppercase peer-focus:tracking-widest"
                >
                  Confirmar Senha
                </label>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white font-bold text-xl uppercase tracking-wider py-4 px-4 rounded-lg mt-2 flex justify-center items-center gap-2 transition-all"
          >
            {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Vamos Lá'}
            {loading || isLogin ? null : <ChevronRight className="w-6 h-6" />}
          </button>
          
          {isLogin && (
            <div className="flex justify-between items-center text-sm text-gray-400 mt-2 font-medium">
              <label className="flex items-center gap-2 cursor-pointer hover:text-gray-300 transition-colors">
                <input type="checkbox" className="rounded bg-black/60 border-white/30 text-red-600 focus:ring-red-600" />
                Lembre-se de mim
              </label>
              <a href="#" className="hover:underline hover:text-gray-300 transition-colors">Esqueceu a senha?</a>
            </div>
          )}
        </form>

        <div className="mt-12 sm:mt-16 text-gray-400 font-medium text-lg">
          {isLogin ? (
            <p>
              Novo por aqui?{' '}
              <button onClick={toggleMode} className="text-white hover:underline font-bold">
                Assine agora.
              </button>
            </p>
          ) : (
            <p>
              Já tem uma conta?{' '}
              <button onClick={toggleMode} className="text-white hover:underline font-bold">
                Entrar.
              </button>
            </p>
          )}
          <p className="text-xs mt-6 font-normal text-gray-500">
            Esta página é protegida pelo Google reCAPTCHA para garantir que você não é um robô.{' '}
            <a href="#" className="text-blue-500 hover:underline">Saiba mais.</a>
          </p>
        </div>
      </div>
      
      {/* Footer / Overlay gradient base */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent z-0 pointer-events-none"></div>
    </div>
  );
}
