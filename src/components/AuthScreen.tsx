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
      setError(err instanceof Error ? err.message : 'Ha ocurrido un error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-cyan-900 via-blue-950 to-indigo-950 relative overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Video with fade effect */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute min-w-full min-h-full object-cover opacity-30"
          style={{
            filter: 'blur(3px)',
            transform: 'scale(1.1)'
          }}
        >
          <source src="/hallword_background.mp4" type="video/mp4" />
          Tu navegador no soporta la etiqueta de video.
        </video>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/80 via-blue-950/80 to-indigo-950/80"></div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-[-50px] right-[-80px] w-64 h-64 bg-gradient-to-br from-cyan-300/20 to-blue-300/20 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-[-30px] left-[-60px] w-72 h-72 bg-gradient-to-tr from-cyan-300/20 to-blue-300/20 rounded-full blur-3xl -z-10"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <div className="flex flex-col items-center gap-2">
            <motion.img 
              src="/logo_hallworld.png"
              alt="Logo de HallWorld"
              className="h-20 w-20 object-contain"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.6,
                ease: [0.6, -0.05, 0.01, 0.99]
              }}
            />
            {/* Brand name with gradient */}
            <motion.span 
              className="text-2xl font-bold bg-gradient-to-br from-cyan-300 via-blue-300 to-indigo-400 bg-clip-text text-transparent [text-shadow:0_2px_4px_rgba(0,0,0,0.2)]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.6,
                delay: 0.3,
                ease: [0.6, -0.05, 0.01, 0.99]
              }}
            >
              HALLWORLD
            </motion.span>
          </div>
        </div>
        
        <div className="relative overflow-hidden rounded-[32px] bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)] p-8">
          {/* Prismatic edge effect */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
          
          <div className="relative z-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-cyan-300 [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]">
                {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta'}
              </h1>
              <p className="text-cyan-400 mt-2 font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                {isLogin
                  ? 'Inicia sesión para continuar'
                  : 'Regístrate para empezar'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="relative">
                  <div className="relative overflow-hidden rounded-xl bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-3 flex items-center gap-3 group hover:shadow-lg hover:shadow-cyan-700/20 transition-all duration-300">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 rounded-full blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
                      <Mail className="w-5 h-5 text-cyan-300 relative z-10" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Correo electrónico"
                      className="flex-1 bg-transparent outline-none text-white placeholder-cyan-300/70 relative z-10"
                      required
                    />
                  </div>
                </div>

                <div className="relative">
                  <div className="relative overflow-hidden rounded-xl bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-3 flex items-center gap-3 group hover:shadow-lg hover:shadow-cyan-700/20 transition-all duration-300">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 rounded-full blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
                      <Lock className="w-5 h-5 text-cyan-300 relative z-10" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Contraseña"
                      className="flex-1 bg-transparent outline-none text-white placeholder-cyan-300/70 relative z-10"
                      required
                    />
                  </div>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-xl bg-rose-900/30 backdrop-blur-md border border-rose-500/20 p-3 text-rose-300 text-sm flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  {error}
                </motion.div>
              )}

              <motion.button
                type="submit"
                className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 p-3 flex items-center justify-center gap-2 group shadow-lg hover:shadow-cyan-700/20 transition-all duration-300"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={loading}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/30" />
                {loading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : isLogin ? (
                  <>
                    <div className="relative">
                      <LogIn className="w-5 h-5 text-white relative z-10" />
                    </div>
                    <span className="font-medium text-white relative z-10 [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">Iniciar sesión</span>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <UserPlus className="w-5 h-5 text-white relative z-10" />
                    </div>
                    <span className="font-medium text-white relative z-10 [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">Registrarse</span>
                  </>
                )}
                <ArrowRight className="w-4 h-4 text-white opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all relative z-10" />
              </motion.button>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-cyan-300 hover:text-cyan-200 font-medium transition-all duration-300"
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