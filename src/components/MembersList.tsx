import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, MessageSquare, User } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

interface Member {
  id: string;
  email: string;
  avatar_url?: string;
}

// New interface for the modal component
interface MemberModalProps {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (memberId: string) => void;
  onViewProfile: (memberId: string) => void;
  getInitials: (email: string) => string;
  getRandomColor: (id: string) => string;
}

// New modal component
function MemberModal({
  member,
  isOpen,
  onClose,
  onSendMessage,
  onViewProfile,
  getInitials,
  getRandomColor
}: MemberModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with flex centering */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative overflow-hidden rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(124,58,237,0.1)] w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Prismatic edge effect */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-70" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/70 to-transparent opacity-70" />
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-50" />
              
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sky-900 hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Member info */}
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className={`w-24 h-24 rounded-full bg-gradient-to-r ${getRandomColor(member.id)} flex items-center justify-center text-white text-3xl font-semibold mb-4 border-2 border-white/30 shadow-lg`}>
                  {getInitials(member.email)}
                </div>
                
                {/* Name */}
                <h3 className="text-xl font-semibold text-sky-900 mb-1">
                  {member.email.split('@')[0]}
                </h3>
                
                {/* Email */}
                <p className="text-sky-700 mb-6">
                  {member.email}
                </p>
                
                {/* Actions */}
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => onSendMessage(member.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-sky-900 hover:bg-white/20 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message</span>
                  </button>
                  
                  <button
                    onClick={() => onViewProfile(member.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-sky-900 hover:bg-white/20 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface MembersListProps {
  isOpen?: boolean;
  onClose?: () => void;
  members: Member[];
  isMobile?: boolean;
  currentUserId?: string | null;
}

export function MembersList({ 
  isOpen = true, 
  onClose = () => {}, 
  members, 
  isMobile = false,
  currentUserId = null
}: MembersListProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const navigate = useNavigate();

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
  };

  const handleSendMessage = (memberId: string) => {
    // Navigate to private chat with this member
    navigate({ to: `/chat/${memberId}` });
  };

  const handleViewProfile = (memberId: string) => {
    // Navigate to profile page
    navigate({ to: `/profile/${memberId}` });
  };

  // Function to get initials from email
  const getInitials = (email: string) => {
    try {
      const parts = email.split('@')[0].split(/[._-]/);
      if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return email.substring(0, 2).toUpperCase();
    } catch (e) {
      return 'U';
    }
  };

  // Function to get a consistent color based on user ID
  const getRandomColor = (id: string) => {
    const colors = [
      'from-violet-400 to-violet-600',
      'from-indigo-400 to-indigo-600',
      'from-blue-400 to-blue-600',
      'from-sky-400 to-sky-600',
      'from-cyan-400 to-cyan-600',
      'from-teal-400 to-teal-600',
      'from-emerald-400 to-emerald-600',
      'from-green-400 to-green-600',
      'from-lime-400 to-lime-600',
      'from-amber-400 to-amber-600',
      'from-orange-400 to-orange-600',
      'from-rose-400 to-rose-600',
      'from-pink-400 to-pink-600',
      'from-fuchsia-400 to-fuchsia-600'
    ];
    
    // Use a simple hash function to get a consistent index
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={isMobile ? { y: "100%" } : { x: "100%" }}
          animate={isMobile ? { y: 0 } : { x: 0 }}
          exit={isMobile ? { y: "100%" } : { x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`fixed ${isMobile ? 'inset-x-0 bottom-0 rounded-t-[32px] max-h-[80vh]' : 'top-0 right-0 bottom-0 w-80 sm:w-96'} z-50 flex flex-col relative overflow-hidden bg-white/10 backdrop-blur-xl border-l border-t border-white/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(124,58,237,0.1)]`}
        >
          {/* Prismatic edge effect */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-70" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/70 to-transparent opacity-70" />
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-50" />
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-700" />
              <h2 className="text-sky-900 font-semibold">Members ({members.length})</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sky-900 hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
            {members.length === 0 ? (
              <div className="p-4 text-center text-sky-700">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3 border border-white/10 shadow-md">
                  <Users className="w-8 h-8 text-sky-600" />
                </div>
                <p className="font-medium text-sky-900 text-lg">No members yet</p>
                <p className="text-sm mt-1 text-sky-700">Send a message to join this group</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {members.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleMemberClick(member)}
                    className={`w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors rounded-xl ${
                      member.id === currentUserId ? 'bg-white/10 border border-white/10' : 'border border-transparent'
                    }`}
                  >
                    {member.avatar_url ? (
                      <img 
                        src={member.avatar_url} 
                        alt={member.email} 
                        className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-md"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getRandomColor(member.id)} flex items-center justify-center text-white font-semibold border border-white/20 shadow-md`}>
                        {getInitials(member.email)}
                      </div>
                    )}
                    <div className="text-left flex-grow">
                      <div className="text-sky-900 font-medium">
                        {member.email.split('@')[0]}
                        {member.id === currentUserId && <span className="ml-2 text-xs opacity-70">(You)</span>}
                      </div>
                      <div className="text-sky-700 text-xs">{member.email}</div>
                    </div>
                    {member.id !== currentUserId && (
                      <button 
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendMessage(member.id);
                        }}
                      >
                        <MessageSquare className="w-4 h-4 text-sky-800 hover:text-sky-600" />
                      </button>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
      
      {/* Member modal */}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          onSendMessage={handleSendMessage}
          onViewProfile={handleViewProfile}
          getInitials={getInitials}
          getRandomColor={getRandomColor}
        />
      )}
    </AnimatePresence>
  );
} 