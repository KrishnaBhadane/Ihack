import React, { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { ShieldCheck, ArrowRight, Lock, Mail, AlertCircle, CheckCircle2, User, KeyRound } from 'lucide-react';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const redirectTarget = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    if (mode === 'register' && !fullName.trim()) {
      setError('Please enter your full legal name as per PAN records.');
      return;
    }

    if (password.length < 8) {
      setError('Security requirement: Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    if (!isSupabaseConfigured() || !supabase) {
      setError('Authentication service is not configured. Please verify environment settings.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() }
          }
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        // If email confirmation is disabled in Supabase, user may already have a session
        if (data?.session) {
          setSuccessMsg('Account created successfully! Redirecting to your borrower portal...');
          setTimeout(() => {
            navigate(redirectTarget || '/customer/dashboard');
          }, 1200);
          return;
        }

        setSuccessMsg('Account created successfully! Please sign in with your credentials.');
        setMode('login');
        setPassword('');
        setLoading(false);
      } else {
        // Sign In
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }

        // Query authentic role assigned in PostgreSQL user_roles table
        const { data: roleRow } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();

        const role = roleRow?.role || 'customer';
        const isStaff = ['underwriter', 'reviewer', 'super_admin'].includes(role);

        setLoading(false);
        if (redirectTarget) {
          navigate(redirectTarget);
        } else if (isStaff) {
          navigate('/admin/dashboard');
        } else {
          navigate('/customer/dashboard');
        }
      }
    } catch (err) {
      console.error('Supabase Auth error:', err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-brand-ink text-white font-display font-bold text-lg mb-3">
            N
          </div>
          <h2 className="font-display font-bold text-2xl text-brand-ink">
            {mode === 'login' ? 'Sign in to NIRNAY' : 'Create an Applicant Account'}
          </h2>
          <p className="mt-1 text-xs text-brand-muted">
            Hero Housing Finance Automated Underwriting Engine
          </p>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Institutional GoTrue Authentication Active</span>
          </div>
        </div>

        {/* Standard Authentication Form */}
        <div className="mt-6 bg-white py-6 px-6 sm:px-8 border border-brand-border rounded shadow-xs">
          {error && (
            <div className="mb-4 p-2.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-brand-ink mb-1">
                  Full Legal Name (as per PAN)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sneha Kulkarni"
                    className="w-full text-xs pl-9 pr-3 py-2 border border-brand-border rounded focus:outline-hidden focus:ring-1 focus:ring-brand-blue focus:border-brand-blue"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-brand-ink mb-1">
                Institutional / Borrower Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full text-xs pl-9 pr-3 py-2 border border-brand-border rounded focus:outline-hidden focus:ring-1 focus:ring-brand-blue focus:border-brand-blue"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-ink mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full text-xs pl-9 pr-3 py-2 border border-brand-border rounded focus:outline-hidden focus:ring-1 focus:ring-brand-blue focus:border-brand-blue"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2 px-4 rounded text-xs font-semibold bg-brand-blue text-white hover:bg-brand-blue-hover transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating with Supabase...</span>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In Securely' : 'Register Applicant Account'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-brand-border text-center text-xs text-brand-muted">
            {mode === 'login' ? (
              <span>
                Need a new mortgage loan account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="font-semibold text-brand-blue hover:underline"
                >
                  Register here
                </button>
              </span>
            ) : (
              <span>
                Already registered with NIRNAY?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="font-semibold text-brand-blue hover:underline"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Security Disclaimers */}
        <div className="mt-6 text-center text-[11px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Protected by PostgreSQL Row Level Security (RLS) & DPDP Act, 2023 Consent Framework</span>
          </p>
          <p>Hero Housing Finance Limited &bull; Institutional Lending Portal</p>
        </div>
      </div>
    </div>
  );
}
