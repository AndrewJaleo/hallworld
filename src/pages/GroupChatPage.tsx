import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Send, ArrowLeft, Paperclip, MoreVertical, Users } from "lucide-react";
import { Header } from "../components/Header";
import { mockGroupChats, mockMessages } from "../lib/mocks";
import { useMediaQuery } from 'react-responsive';
import { MembersList } from '../components/MembersList';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_email?: string;
}

interface Member {
  id: string;
  email: string;
  avatar_url?: string;
}

export function GroupChatPage() {
  const { id } = useParams({ from: '/group-chat/$id' });
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(mockMessages[id] || []);
  const [newMessage, setNewMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const groupInfo = mockGroupChats[id];
  const mockUserId = "user1"; // Simulating current user
  const mockUserEmail = "alice@example.com"; // Simulating current user email
  const [showMembers, setShowMembers] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 1024 });
  
  const mockMembers: Member[] = [
    { id: 'user1', email: 'alice@example.com' },
    { id: 'user2', email: 'bob@example.com' },
    { id: 'user3', email: 'charlie@example.com' },
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      content: newMessage,
      sender_id: mockUserId,
      sender_email: mockUserEmail,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessage("");
    
    // Scroll to bottom after sending message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const goBack = () => {
    navigate({ to: "/" });
  };

  if (!groupInfo) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-sky-400 via-blue-500 to-indigo-500 flex items-center justify-center">
        <div className="text-white">Group not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-sky-400 via-blue-500 to-indigo-500 flex flex-col fixed inset-0">
      <Header unreadChats={0} userEmail={mockUserEmail} />

      <div className="flex flex-grow mt-20 relative">
        <div className="flex-1 flex flex-col relative">
          {/* Chat Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glossy p-3 flex items-center gap-3 z-10 sticky top-20"
          >
            <button
              onClick={goBack}
              className="glass-button p-2 rounded-full"
            >
              <ArrowLeft className="w-5 h-5 text-sky-800" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-400 to-violet-600 flex items-center justify-center text-white">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-sky-900">
                  {groupInfo.name}
                </h2>
                <p className="text-xs text-sky-700">
                  Group Chat
                </p>
              </div>
            </div>

            {isMobile && (
              <button 
                onClick={() => setShowMembers(true)}
                className="glass-button p-2 rounded-full ml-auto"
              >
                <Users className="w-5 h-5 text-sky-800" />
              </button>
            )}
          </motion.div>

          {/* Chat Messages */}
          <div className="flex-grow overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-10 text-sky-700">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    message.sender_id === mockUserId ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs sm:max-w-md rounded-xl p-3 ${
                      message.sender_id === mockUserId
                        ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white"
                        : "glossy text-sky-900"
                    }`}
                  >
                    {message.sender_id !== mockUserId && (
                      <div className="text-xs text-sky-600 mb-1">
                        {message.sender_email}
                      </div>
                    )}
                    <div className="text-sm">{message.content}</div>
                    <div
                      className={`text-xs mt-1 ${
                        message.sender_id === mockUserId ? "text-violet-200" : "text-sky-700"
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sticky bottom-0"
          >
            <form
              onSubmit={handleSendMessage}
              className="glossy p-2 rounded-full flex items-center gap-2"
            >
              <button
                type="button"
                className="glass-button p-2 rounded-full text-sky-800"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="bg-transparent flex-grow px-3 py-2 outline-none text-sky-900 placeholder:text-sky-600"
              />
              
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className={`glass-button p-2 rounded-full ${
                  newMessage.trim() ? "bg-gradient-to-r from-violet-500 to-violet-600" : "opacity-50"
                }`}
              >
                <Send className={`w-5 h-5 ${newMessage.trim() ? "text-white" : "text-sky-800"}`} />
              </button>
            </form>
          </motion.div>
        </div>

        {/* Members List */}
        <MembersList
          isOpen={isMobile ? showMembers : true}
          onClose={() => setShowMembers(false)}
          members={mockMembers}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
} 