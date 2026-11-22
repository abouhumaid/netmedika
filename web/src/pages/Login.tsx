import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Apple, Eye, EyeOff, LockKeyhole, Mail, Pill, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import './Login.css';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { error, success } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  const from = (location.state as any)?.from?.pathname || '/';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      error('Fields required', 'Enter your administrator email and password to continue.');
      return;
    }
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      success('Welcome back', 'Your administrator session is ready.');
      navigate(from, { replace: true });
    } catch (err) {
      error('Unable to sign in', err instanceof Error ? err.message : 'Check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="netmedika-login min-h-screen bg-white lg:grid lg:grid-cols-2">
      <section className="netmedika-login__brand relative hidden min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0F766E] to-[#115E59] px-10 lg:flex">
        <div className="absolute inset-0 opacity-[0.055]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="relative z-10 flex max-w-sm flex-col items-center text-center">
          <div className="mb-7 flex h-36 w-36 items-center justify-center rounded-2xl bg-white shadow-2xl ring-4 ring-white/15">
            <span className="flex h-[126px] w-[126px] items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-emerald-100 text-teal-700"><Pill size={62} strokeWidth={1.6} className="-rotate-45"/></span>
          </div>
          <div className="mb-2 flex items-center justify-center gap-2 text-teal-50/85"><ShieldCheck size={13}/><span className="text-[10px] uppercase tracking-[0.18em]">Netmedika Pharmacy</span></div>
          <h1 className="text-2xl font-semibold text-white">Pharmacy Operations</h1>
          <p className="mt-3 max-w-xs text-sm leading-6 text-teal-50/75">A secure workspace for reviewing prescriptions and keeping customer orders moving.</p>
        </div>
      </section>

      <section className="netmedika-login__panel flex min-h-screen items-center justify-center bg-white px-6 py-8 sm:px-10">
        <div className="netmedika-login__content w-full max-w-[390px]">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-700 text-white"><Pill size={22} className="-rotate-45"/></span>
            <span><span className="block text-base font-bold text-slate-900">Netmedika</span><span className="block text-[10px] uppercase tracking-widest text-slate-400">Pharmacy operations</span></span>
          </div>

          <div className="mb-8">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><ShieldCheck size={19}/></div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.17em] text-teal-700">Administrator portal</p>
            <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">Sign in</h2>
            <p className="mt-2 text-sm leading-5 text-slate-500">Access your pharmacy workspace.</p>
          </div>

          <div className="netmedika-login__social-row">
            <button type="button" className="netmedika-login__social-button" onClick={() => error('Google sign-in unavailable', 'Google sign-in is not configured for the administrator portal.')}><GoogleWordmark /></button>
            <button type="button" className="netmedika-login__social-button" onClick={() => error('Apple sign-in unavailable', 'Apple sign-in is not configured for the administrator portal.')}><Apple size={18} strokeWidth={2.1}/><span>Apple</span></button>
          </div>
          <div className="netmedika-login__divider"><span/><span>or continue with</span><span/></div>

          <form onSubmit={handleSubmit} noValidate>
            <Field label="Administrator email" focused={focused === 'email'} icon={<Mail size={16}/>}>
            <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} placeholder="admin@netmedika.com" required className="netmedika-login__input w-full bg-transparent pb-2 text-sm text-slate-800 outline-none placeholder:text-slate-400" />
            </Field>

            <Field label="Password" focused={focused === 'password'} icon={<LockKeyhole size={16}/>}>
              <div className="flex items-center">
                <input id="admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} placeholder="Enter your password" required className="netmedika-login__input w-full bg-transparent pb-2 text-sm text-slate-800 outline-none placeholder:text-slate-400" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="mb-2 ml-2 text-slate-400 transition hover:text-teal-700">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
              </div>
            </Field>

            <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="netmedika-login__submit enter-btn mt-2 h-11 w-full rounded-lg bg-teal-700 text-sm font-semibold hover:bg-teal-800" rightIcon={<ArrowRight size={15}/>}>{isLoading ? 'Signing in…' : 'Sign in to dashboard'}</Button>
          </form>

          <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-slate-100"/><span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Demo access</span><span className="h-px flex-1 bg-slate-100"/></div>
          <button type="button" onClick={() => { setEmail('admin@netmedika.com'); setPassword('Admin123456!'); }} className="netmedika-login__demo group flex w-full items-center justify-between rounded-lg border border-teal-100 bg-teal-50/70 px-3.5 py-3 text-left transition hover:border-teal-200 hover:bg-teal-50">
            <span className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white"><Sparkles size={14}/></span><span><span className="block text-xs font-semibold text-slate-800">Quick-fill demo credentials</span><span className="mt-0.5 block text-[11px] text-slate-500">admin@netmedika.com</span></span></span>
            <span className="text-[10px] font-semibold text-teal-700 transition group-hover:translate-x-0.5">Auto-fill <ArrowRight size={12} className="ml-1 inline"/></span>
          </button>

          <div className="mt-6 flex items-center gap-2 text-[10px] leading-4 text-slate-400"><LockKeyhole size={13} className="shrink-0 text-teal-700"/><span>Restricted to authorized pharmacy administrators.</span></div>
          <p className="mt-8 text-center text-[10px] text-slate-400">&copy; {new Date().getFullYear()} Netmedika. All rights reserved.</p>
        </div>
      </section>
    </main>
  );
};

function Field({ label, icon, focused, children }: { label: string; icon: React.ReactNode; focused: boolean; children: React.ReactNode }) {
  return <div className="netmedika-login__field mb-6"><label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</label><div className="flex items-start gap-3"><span className={`mt-0.5 ${focused ? 'text-teal-700' : 'text-slate-400'}`}>{icon}</span><div className="min-w-0 flex-1 border-b-[1.5px] transition-colors" style={{ borderColor: focused ? '#0F766E' : '#DCE5E2' }}>{children}</div></div></div>;
}

function GoogleWordmark() {
  return <span className="netmedika-login__google"><b>G</b><b>o</b><b>o</b><b>g</b><b>l</b><b>e</b></span>;
}
