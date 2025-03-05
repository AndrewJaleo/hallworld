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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white/10 backdrop-blur-xl p-6 pt-8 pb-8 rounded-2xl z-50 w-full max-w-xs shadow-xl mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={onClose}
                className="absolute top-3 right-3 text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center">
                {/* Profile Picture */}
                <div className="mb-5">
                  {member.avatar_url ? (
                    <img 
                      src={member.avatar_url} 
                      alt={member.email} 
                      className="w-28 h-28 rounded-full object-cover border-2 border-white/20 shadow-lg"
                    />
                  ) : (
                    <div className={`w-28 h-28 rounded-full bg-gradient-to-r ${getRandomColor(member.id)} flex items-center justify-center text-white text-3xl font-semibold border-2 border-white/20 shadow-lg`}>
                      {getInitials(member.email)}
                    </div>
                  )}
                </div>
                
                {/* User Info */}
                <h3 className="text-white text-xl font-semibold mb-1">{member.email.split('@')[0]}</h3>
                <p className="text-white/70 mb-8">{member.email}</p>
                
                {/* Action Buttons */}
                <div className="flex gap-8 w-full justify-center">
                  <button
                    onClick={() => onSendMessage(member.id)}
                    className="flex flex-col items-center group"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-r from-violet-500 to-violet-600 flex items-center justify-center mb-2 shadow-lg group-hover:shadow-violet-500/30 group-hover:scale-110 transition-all duration-200">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white text-sm font-medium group-hover:text-violet-200 transition-colors">Message</span>
                  </button>
                  
                  <button
                    onClick={() => onViewProfile(member.id)}
                    className="flex flex-col items-center group"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-2 shadow-lg group-hover:shadow-white/20 group-hover:bg-white/20 group-hover:scale-110 transition-all duration-200">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white text-sm font-medium group-hover:text-white/90 transition-colors">Profile</span>
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
  const navigate = useNavigate();
  // Add state for the selected member and modal visibility
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMemberClick = (member: Member) => {
    // Don't show modal for yourself
    if (member.id === currentUserId) return;
    
    // Show the modal with the selected member
    setSelectedMember(member);
    setIsModalOpen(true);
  };
  
  const handleSendMessage = (memberId: string) => {
    navigate({ to: `/chat/${memberId}` });
    setIsModalOpen(false);
    if (isMobile) onClose();
  };
  
  const handleViewProfile = (memberId: string) => {
    // Navigate to profile page (you can implement this later)
    navigate({ to: `/profile/${memberId}` });
    setIsModalOpen(false);
    if (isMobile) onClose();
  };

  const containerClass = isMobile
    ? "fixed inset-y-0 right-0 w-80 z-50"
    : "w-80 border-l border-white/10";

  const getInitials = (email: string) => {
    // Extract the part before @ in the email
    const name = email.split('@')[0];
    // If the name has a dot, use first letters of each part
    if (name.includes('.')) {
      return name.split('.')
        .map(part => part.charAt(0).toUpperCase())
        .join('');
    }
    // Otherwise just use the first letter
    return name.charAt(0).toUpperCase();
  };
  
  const getRandomColor = (id: string) => {
    // Generate a consistent color based on the user ID
    const colors = [
      'from-violet-400 to-violet-600',
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-yellow-400 to-yellow-600',
      'from-red-400 to-red-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
      'from-teal-400 to-teal-600'
    ];
    
    // Use the sum of character codes in the ID to pick a color
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[sum % colors.length];
  };

  const content = (
    <div className={`h-full bg-white/10 backdrop-blur-xl ${isMobile ? '' : 'rounded-l-2xl'}`}>
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Members <span className="bg-white/20 text-xs rounded-full px-2 py-0.5 ml-1">{members.length}</span>
        </h2>
        {isMobile && (
          <button onClick={onClose} className="text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="overflow-y-auto h-[calc(100%-60px)]">
        {members.length === 0 ? (
          <div className="p-4 text-center text-white/60">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-white/40" />
            </div>
            <p className="font-medium text-white/80">No members yet</p>
            <p className="text-sm mt-1">Send a message to join this group</p>
          </div>
        ) : (
          members.map((member) => (
            <button
              key={member.id}
              onClick={() => handleMemberClick(member)}
              className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors ${
                member.id === currentUserId ? 'bg-white/10' : ''
              }`}
            >
              {member.avatar_url ? (
                <img 
                  src={member.avatar_url} 
                  alt={member.email} 
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getRandomColor(member.id)} flex items-center justify-center text-white font-semibold`}>
                  {getInitials(member.email)}
                </div>
              )}
              <div className="text-left flex-grow">
                <div className="text-white font-medium">
                  {member.email}
                  {member.id === currentUserId && <span className="ml-2 text-xs opacity-70">(You)</span>}
                </div>
                <div className="text-white/60 text-sm">Online</div>
              </div>
              {member.id !== currentUserId && (
                <button 
                  className="p-2 rounded-full hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSendMessage(member.id);
                  }}
                >
                  <MessageSquare className="w-4 h-4 text-white/70" />
                </button>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Member Modal */}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSendMessage={handleSendMessage}
          onViewProfile={handleViewProfile}
          getInitials={getInitials}
          getRandomColor={getRandomColor}
        />
      )}
      
      {/* Members List */}
      {isMobile ? (
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
      ) : (
        <div className={containerClass}>{content}</div>
      )}
    </>
  );
} 