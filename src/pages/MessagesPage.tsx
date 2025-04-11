import React from 'react';
import { PrivateChatsList } from '../components/PrivateChatsList';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

export function MessagesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pt-28 pb-24">
      {/* Header with title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <MessageSquare size={20} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            My Conversations
          </h1>
        </motion.div>
      </div>

      {/* Chat list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <PrivateChatsList />
      </motion.div>
    </div>
  );
}
