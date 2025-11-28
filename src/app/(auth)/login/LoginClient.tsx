'use client';

import React, { useEffect, useState, useId } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { LoginVisualStage } from '@/components/visuals/LoginScene';

/* ──────────────────────── CUSTOM FEATURE ICONS ──────────────────────── */
type FeatureIconProps = { className?: string };

const IconConstellation: React.FC<FeatureIconProps> = ({ className }) => {
  const gradientId = useId();
  return (
    <motion.svg
      viewBox="0 0 64 64"
      className={`h-11 w-11 text-white ${className ?? ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="22" stroke={`url(#${gradientId})`} strokeWidth="2" fill="none" opacity="0.6" />
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        style={{ originX: '32px', originY: '32px' }}
        stroke={`url(#${gradientId})`}
      >
        <path
          d="M16 34c6-4 12-6 16-12s8-10 16-12"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />
        <circle cx="16" cy="34" r="3" fill={`url(#${gradientId})`} />
        <circle cx="32" cy="20" r="3" fill={`url(#${gradientId})`} />
        <circle cx="48" cy="10" r="2.5" fill={`url(#${gradientId})`} />
      </motion.g>
    </motion.svg>
  );
};

const IconAutomation: React.FC<FeatureIconProps> = ({ className }) => {
  const gradientId = useId();
  return (
    <motion.svg
      viewBox="0 0 64 64"
      className={`h-11 w-11 text-white ${className ?? ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="18" stroke={`url(#${gradientId})`} strokeWidth="2" fill="none" opacity="0.65" />
      <motion.circle
        cx="32"
        cy="32"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeDasharray="63"
        animate={{ strokeDashoffset: [63, 0, 63] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <path
        d="M26 32h12M32 26v12"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <motion.circle
        cx="48"
        cy="20"
        r="4"
        fill={`url(#${gradientId})`}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </motion.svg>
  );
};

const IconLaunch: React.FC<FeatureIconProps> = ({ className }) => {
  const gradientId = useId();
  return (
    <motion.svg
      viewBox="0 0 64 64"
      className={`h-11 w-11 text-white ${className ?? ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <motion.path
        d="M32 10c6 3 11 9 12 16 0 9-6 18-12 22-6-4-12-13-12-22 1-7 6-13 12-16Z"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M32 20a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"
        fill={`url(#${gradientId})`}
        opacity="0.8"
      />
      <motion.path
        d="M24 44c3 4 5 8 8 10 3-2 5-6 8-10"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.svg>
  );
};

/* ─────────────────────────── SPINNER ─────────────────────────── */
export const Spinner = () => (
  <div className="w-6 h-6 border-2 border-apple-blue-500 border-t-transparent rounded-full animate-spin" />
);

/* ──────────────────────── NOTIFICATION ──────────────────────── */
const Notification: React.FC<{
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}> = ({ type, message, onClose }) => {
  const icons = {
    success: <CheckCircle size={20} className="text-apple-green-400" />,
    error: <AlertCircle size={20} className="text-apple-red-400" />,
    info: <AlertCircle size={20} className="text-apple-blue-400" />,
  };

  const colors = {
    success: 'border-apple-green-500/30 bg-apple-green-500/10',
    error: 'border-apple-red-500/30 bg-apple-red-500/10',
    info: 'border-apple-blue-500/30 bg-apple-blue-500/10',
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 p-4 rounded-apple border backdrop-blur-apple ${colors[type]} shadow-apple-lg max-w-md`}
    >
      {icons[type]}
      <span className="apple-body text-white flex-1">{message}</span>
      <button
        onClick={onClose}
        className="text-white/60 hover:text-white transition-colors"
      >
        ×
      </button>
    </motion.div>
  );
};

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const cardClassName =
    "relative overflow-hidden rounded-[24px] border border-white/12 bg-[rgba(6,10,22,0.78)] px-6 py-8 shadow-[0_35px_80px_rgba(2,6,17,0.55)] backdrop-blur-[26px] before:pointer-events-none before:absolute before:-z-10 before:inset-px before:rounded-[22px] before:border before:border-white/5 before:bg-[linear-gradient(150deg,rgba(255,255,255,0.14)_0%,rgba(59,130,246,0.05)_60%,rgba(12,83,106,0.06)_100%)] before:opacity-85 before:content-['']";
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '3.2.1';
  const featureHighlights: { title: string; description: string; icon: React.ReactNode }[] = [
    {
      title: 'Operaciones bajo control',
      description: 'Tableros en tiempo real para logística, inventario y ventas.',
      icon: <IconConstellation />,
    },
    {
      title: 'Automatización inteligente',
      description: 'Alertas con IA que anticipan quiebres de stock y fraudes.',
      icon: <IconAutomation />,
    },
    {
      title: 'Onboarding express',
      description: 'Integraciones listas y soporte dedicado para activar en días.',
      icon: <IconLaunch />,
    },
  ];

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
  };

  const clearNotification = () => setNotification(null);

  // Login handler - CORREGIDO para usar endpoint unificado
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotification();
    
    if (!username || !password) {
      showNotification('error', 'Por favor completa tu usuario y contraseña.');
      return;
    }

    setLoading(true);
    setShowProgress(true);
    
    try {
      // CAMBIO CRÍTICO: Usar endpoint unificado
      const response = await fetch('/endpoints/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          username: username.trim(), 
          password 
        }),
      });
      
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Usuario o contraseña incorrectos.');
      }

      const redirectTo = searchParams.get('redirectTo') || '/post-login';
      showNotification('success', 'Acceso verificado. Redirigiendo...');
      
      setTimeout(() => {
        router.replace(redirectTo);
      }, 1000);
      
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setLoading(false);
      setShowProgress(false);
    }
  };

  // Change password handler - CORREGIDO para usar endpoint unificado
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotification();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification('error', 'Por favor completa todos los campos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('error', 'Las contraseñas nuevas no coinciden.');
      return;
    }

    if (!PASSWORD_RULE.test(newPassword)) {
      showNotification('error', 'La contraseña debe tener al menos 8 caracteres, incluyendo letras y números.');
      return;
    }

    setChangingPassword(true);

    try {
      // CAMBIO CRÍTICO: Usar endpoint unificado
      const response = await fetch('/endpoints/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username.trim(),
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Error al cambiar la contraseña.');
      }

      showNotification('success', 'Contraseña cambiada exitosamente.');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <LoginVisualStage />
      <div className="absolute inset-0 z-20 bg-gradient-to-b from-[#01030a] via-[#020617] to-[#03040d]" />
      <div className="absolute inset-0 z-30 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.2),transparent_55%)] mix-blend-screen opacity-60" />

      <AnimatePresence>
        {showProgress && (
          <motion.div
            key="progress"
            className="fixed top-0 left-0 right-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="h-1 w-full bg-gradient-to-r from-transparent via-apple-blue-400 to-apple-green-400"
              initial={{ scaleX: 0.2, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-40 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-6xl gap-6 rounded-[36px] border border-white/10 bg-white/5 px-0 shadow-[0_45px_120px_rgba(2,6,23,0.6)] backdrop-blur-[18px] lg:grid-cols-[380px,1fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col gap-8 px-8 py-10"
          >
            <div className="space-y-4 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="mx-auto h-16 w-16 lg:mx-0"
              >
                <div className="relative h-full w-full">
                  <Image
                    src="/22.svg"
                    alt="Atlas Suite"
                    fill
                    priority
                    sizes="64px"
                    className="object-contain"
                  />
                </div>
              </motion.div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/50">Atlas Suite</p>
                <h1 className="mt-2 text-3xl font-semibold text-white">Acceso Corporativo</h1>
                <p className="mt-1 text-sm text-white/65">Inicia sesión para continuar con tus operaciones.</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!showChangePassword ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className={cardClassName}
                >
                  <div className="mb-6 space-y-1">
                    <p className="text-sm font-semibold text-white/80">Introduce tus credenciales</p>
                    <p className="text-xs text-white/60">Solo usuarios autorizados Atlas Suite.</p>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.25em] text-white/55">
                          Usuario
                        </label>
                        <div className="relative">
                          <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-500" />
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="field pl-10"
                            placeholder="Ingresa tu usuario"
                            disabled={loading}
                            autoComplete="username"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.25em] text-white/55">
                          Contraseña
                        </label>
                        <div className="relative">
                          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-500" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="field pl-10 pr-10"
                            placeholder="Ingresa tu contraseña"
                            disabled={loading}
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray-500 transition-colors hover:text-white"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button
                        type="submit"
                        disabled={loading}
                        data-loading={loading}
                        className="btn-primary w-full"
                      >
                        {loading ? (
                          <>
                            <Spinner />
                            Verificando acceso...
                          </>
                        ) : (
                          'Iniciar Sesión'
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowChangePassword(true)}
                        className="w-full text-sm font-medium text-white/70 underline-offset-[6px] transition-colors duration-200 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                        disabled={loading}
                      >
                        Cambiar Contraseña
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="change-password"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className={cardClassName}
                >
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-white">Cambiar Contraseña</h2>
                    <p className="text-sm text-white/60">
                      Usa al menos 8 caracteres combinando mayúsculas, números y símbolos.
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.25em] text-white/55">
                          Contraseña Actual
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="field"
                          placeholder="Contraseña actual"
                          disabled={changingPassword}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.25em] text-white/55">
                          Nueva Contraseña
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="field"
                          placeholder="Nueva contraseña"
                          disabled={changingPassword}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.25em] text-white/55">
                          Confirmar Contraseña
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="field"
                          placeholder="Confirmar nueva contraseña"
                          disabled={changingPassword}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setShowChangePassword(false)}
                        className="btn-secondary flex-1"
                        disabled={changingPassword}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={changingPassword}
                        data-loading={changingPassword}
                        className="btn-primary flex-1"
                      >
                        {changingPassword ? (
                          <>
                            <Spinner />
                            Cambiando...
                          </>
                        ) : (
                          'Cambiar'
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-center text-[13px] text-white/60 lg:text-left">© 2025 Atlas Suite · v{appVersion}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: 'easeOut' }}
            className="space-y-8 rounded-t-[36px] border-t border-white/5 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.25),transparent_65%)] px-8 py-10 text-white lg:rounded-t-none lg:rounded-r-[36px] lg:border-l"
          >
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.4em] text-white/60">Plataforma Atlas</p>
              <h2 className="text-3xl font-semibold">Precisión total para equipos de impacto</h2>
              <p className="text-white/70">
                Centraliza ventas, operaciones e inteligencia financiera en un mismo entorno, con la
                velocidad de una app consumer y la profundidad de una suite corporativa.
              </p>
            </div>

            <div className="space-y-4">
              {featureHighlights.map(({ title, description, icon }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md"
                >
                  <div className="rounded-2xl bg-white/8 p-1.5 text-white">{icon}</div>
                  <div>
                    <p className="text-base font-semibold">{title}</p>
                    <p className="text-sm text-white/70">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-primary px-6 py-3 text-base">
              Hablar con un consultor Atlas
            </button>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={clearNotification}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
