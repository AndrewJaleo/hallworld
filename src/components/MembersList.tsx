import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

interface Member {
  id: string;
  email: string;
  avatar_url?: string;
}

interface MembersListProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  isMobile: boolean;
}

export function MembersList({ isOpen, onClose, members, isMobile }: MembersListProps) {
  const navigate = useNavigate();

  const handleMemberClick = (memberId: string) => {
    navigate({ to: `/chat/${memberId}` });
    if (isMobile) onClose();
  };

  const containerClass = isMobile
    ? "fixed inset-y-0 right-0 w-80 z-50"
    : "w-80 border-l border-white/10";

  const content = (
    <div className={`h-full bg-white/10 backdrop-blur-xl ${isMobile ? '' : 'rounded-l-2xl'}`}>
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Members
        </h2>
        {isMobile && (
          <button onClick={onClose} className="text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="overflow-y-auto h-[calc(100%-60px)]">
        {members.map((member) => (
          <button
            key={member.id}
            onClick={() => handleMemberClick(member.id)}
            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-400 to-violet-600 flex items-center justify-center text-white font-semibold">
              {member.email.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-white font-medium">{member.email}</div>
              <div className="text-white/60 text-sm">Online</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={containerClass}
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return <div className={containerClass}>{content}</div>;
} 