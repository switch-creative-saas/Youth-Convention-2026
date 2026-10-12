import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Printer } from 'lucide-react';
import { ConventionTag } from '@/components/ConventionTag';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export function MemberID() {
  const { members } = useAppData();
  const { user } = useAuth();
  const { addToast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const member = members.find(m => m.email === user?.email) || members[0];

  const handleDownload = () => {
    addToast({ type: 'success', title: 'ID card downloaded!' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-md mx-auto">
      <motion.h2 className="font-display font-bold text-2xl text-portal-ink dark:text-white mb-5"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        My Digital ID
      </motion.h2>

      {/* ID Card */}
      <motion.div
        ref={cardRef}
        className="overflow-hidden"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        whileHover={{ y: -8 }}
      >
        <ConventionTag member={member} />
      </motion.div>

      {/* Actions */}
      <div className="flex gap-3 mt-5">
        <motion.button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-portal-line dark:border-white/10 text-sm font-medium text-portal-ink dark:text-portal-label hover:bg-portal-surface dark:hover:bg-white/5 transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          <Download className="w-4 h-4" /> Download
        </motion.button>
        <motion.button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-portal-line dark:border-white/10 text-sm font-medium text-portal-ink dark:text-portal-label hover:bg-portal-surface dark:hover:bg-white/5 transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          <Printer className="w-4 h-4" /> Print Badge
        </motion.button>
      </div>
    </div>
  );
}
