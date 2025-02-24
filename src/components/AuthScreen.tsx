import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }
      onAuthSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-sky-400 via-blue-500 to-indigo-500"
      style={{
        backgroundImage: `
          linear-gradient(135deg, 
            rgba(244, 114, 182, 0.6),
            rgba(168, 85, 247, 0.6),
            rgba(59, 130, 246, 0.6)
          ),
          url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glossy p-8 rounded-3xl relative overflow-hidden">
          {/* Enhanced glass layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/20 backdrop-blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/40 to-white/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-100/30 to-white/50" />
          
          {/* Prismatic edge effect */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-70" />
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white to-transparent opacity-90" />
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white to-transparent opacity-70" />
          
          {/* Decorative elements */}
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500 rounded-full blur-[100px] opacity-40 animate-pulse" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-500 rounded-full blur-[100px] opacity-40 animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 rounded-full blur-[100px] opacity-20 animate-[pulse_4s_ease-in-out_infinite]" />
          
          {/* Light beam effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rotate-45 transform-gpu overflow-hidden">
            <div className="absolute inset-0 animate-[beam_4s_ease-in-out_infinite]" />
          </div>
          
          <div className="relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
              {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta'}
            </h1>
            <p className="text-gray-600 mt-2 font-medium">
              {isLogin
                ? 'Inicia sesión para continuar'
                : 'Regístrate para empezar'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="relative">
                <div className="glass-button p-3 flex items-center gap-3 group hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-300">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-fuchsia-500 to-violet-500 rounded-full blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
                    <Mail className="w-5 h-5 text-fuchsia-500 relative z-10" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Correo electrónico"
                    className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400 relative z-10"
                    required
                  />
                </div>
              </div>

              <div className="relative">
                <div className="glass-button p-3 flex items-center gap-3 group hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-300">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-500 rounded-full blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
                    <Lock className="w-5 h-5 text-blue-500 relative z-10" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400 relative z-10"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-button p-3 text-rose-600 text-sm flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              className="w-full glass-button p-3 flex items-center justify-center gap-2 group relative overflow-hidden"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={loading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/30" />
              {loading ? (
                <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
              ) : isLogin ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 rounded-full blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
                    <LogIn className="w-5 h-5 text-teal-500 relative z-10" />
                  </div>
                  <span className="font-medium text-gray-700 relative z-10">Iniciar sesión</span>
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-full blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
                    <UserPlus className="w-5 h-5 text-orange-500 relative z-10" />
                  </div>
                  <span className="font-medium text-gray-700 relative z-10">Registrarse</span>
                </>
              )}
              <ArrowRight className="w-4 h-4 text-indigo-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all relative z-10" />
            </motion.button>

            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent hover:from-pink-700 hover:via-purple-700 hover:to-indigo-700 font-medium transition-all duration-300"
              >
                {isLogin
                  ? '¿No tienes cuenta? Regístrate'
                  : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}