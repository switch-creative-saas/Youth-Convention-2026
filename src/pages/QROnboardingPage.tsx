import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, UserCheck } from 'lucide-react';
import { AuthHeader } from '@/components/auth/AuthExperience';

export function QROnboardingPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  return (
    <div className="portal-theme portal-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-4 pb-8 pt-28">
      <AuthHeader homeHref="/convention/status" hireDeveloperHref="/convention/hire" />
      <div className="floating-orb w-[200px] h-[200px] top-20 left-20" style={{ background: 'radial-gradient(circle, rgba(138,138,133,0.08) 0%, transparent 70%)' }} />
      <div className="floating-orb w-[150px] h-[150px] bottom-32 right-16 animate-float-reverse" style={{ background: 'radial-gradient(circle, rgba(138,138,133,0.08) 0%, transparent 70%)' }} />

      <motion.div
        className="w-full max-w-[420px]"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="portal-card p-5 text-center sm:p-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-portal-dark">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="font-display font-bold text-2xl text-portal-ink mb-2">Welcome to MOSYF!</h2>
          <p className="text-sm text-portal-label mb-8">You&apos;re about to join Mountain of Solution Youth Fellowship</p>

          <div className="space-y-4">
            <motion.button
              className="w-full h-[120px] rounded-2xl flex flex-col items-center justify-center gap-2 bg-portal-accent text-portal-accent-ink shadow-surface"
              whileHover={{ y: -4, scale: 1.02, boxShadow: '0 16px 40px rgba(138,138,133,0.4)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/register/member?token=${token}`)}
            >
              <Sparkles className="w-8 h-8" />
              <span className="font-semibold text-base">I&apos;m a First Timer</span>
              <span className="text-xs opacity-70">New to MOSYF? Start here!</span>
            </motion.button>

            <motion.button
              className="flex h-[120px] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-portal-dark text-white shadow-lg"
              whileHover={{ y: -4, scale: 1.02, boxShadow: '0 16px 40px rgba(138,138,133,0.4)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/login')}
            >
              <UserCheck className="w-8 h-8" />
              <span className="font-semibold text-base">I&apos;m a Returning Member</span>
              <span className="text-xs text-white/70">Already a member? Check in here!</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
