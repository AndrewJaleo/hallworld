import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { Header } from "../components/Header";
import { Send, ArrowLeft, Paperclip, MoreVertical, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_email?: string;
  read_at?: string | null;
}

interface ChatUser {
  id: string;
  email: string;
  avatar_url?: string;
}

export function ChatPage() {
  const { id } = useParams({ from: "/chat/$id" });
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [chatPartner, setChatPartner] = useState<ChatUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || "");
        setUserId(session.user.id);
      } else {
        navigate({ to: "/" });
      }
    });
  }, [navigate]);

  // Separate useEffect for fetching chat details when userId or id changes
  useEffect(() => {
    if (!userId || !id) return;
    
    const fetchChatDetails = async () => {
      try {
        setIsLoading(true);
        // Fetch the chat to get the other user's ID
        const { data: chatData, error: chatError } = await supabase
          .from("private_chats")
          .select("*")
          .eq("id", id)
          .single();

        if (chatError) throw chatError;

        // Determine which user is the chat partner
        if (chatData) {
          const partnerId = 
            chatData.user1_id === userId ? chatData.user2_id : chatData.user1_id;

          // Fetch chat partner details
          const { data: userData, error: userError } = await supabase
            .from("profiles")
            .select("id, email, avatar_url")
            .eq("id", partnerId)
            .single();

          if (userError) throw userError;
          setChatPartner(userData);
        }

        // Load chat messages
        const { data: messagesData, error: messagesError } = await supabase
          .from("private_messages")
          .select(`
            id,
            content,
            sender_id,
            created_at,
            read_at
          `)
          .eq("chat_id", id)
          .order("created_at", { ascending: true });

        if (messagesError) throw messagesError;

        // Get all unique sender IDs
        const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];
        
        // Fetch profiles for all senders in a single query
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", senderIds);
          
        if (profilesError) throw profilesError;
        
        // Create a map of user IDs to emails for quick lookup
        const userEmailMap = profilesData.reduce((map, profile) => {
          map[profile.id] = profile.email;
          return map;
        }, {} as Record<string, string>);

        // Format messages with sender email
        const formattedMessages = messagesData.map((msg) => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          created_at: msg.created_at,
          read_at: msg.read_at,
          sender_email: userEmailMap[msg.sender_id] || ""
        }));

        setMessages(formattedMessages);
        
        // Mark unread messages as read
        const unreadMessages = formattedMessages.filter(
          msg => msg.sender_id !== userId && !msg.read_at
        );
        
        if (unreadMessages.length > 0) {
          const unreadIds = unreadMessages.map(msg => msg.id);
          
          await supabase
            .from("private_messages")
            .update({ read_at: new Date().toISOString() })
            .in("id", unreadIds);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching chat details:", error);
        setIsLoading(false);
      }
    };

    fetchChatDetails();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`private_chat:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `chat_id=eq.${id}`
        },
        async (payload) => {
          // Skip if we've already processed this message
          if (processedMessageIdsRef.current.has(payload.new.id)) {
            return;
          }
          
          // Add this message ID to our processed set
          processedMessageIdsRef.current.add(payload.new.id);
          
          // Get sender email
          const { data: senderData, error: senderError } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", payload.new.sender_id)
            .single();

          if (senderError) {
            console.error("Error fetching sender data:", senderError);
            return;
          }

          const newMsg: Message = {
            id: payload.new.id,
            content: payload.new.content,
            sender_id: payload.new.sender_id,
            created_at: payload.new.created_at,
            read_at: payload.new.read_at,
            sender_email: senderData?.email || ""
          };

          setMessages((prev) => [...prev, newMsg]);
          
          // Mark message as read if it's from the partner
          if (payload.new.sender_id !== userId) {
            await supabase
              .from("private_messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id, userId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      // Create a temporary ID for optimistic UI update
      const tempId = `temp-${Date.now()}`;
      
      // Add message to UI immediately (optimistic update)
      const tempMessage: Message = {
        id: tempId,
        content: newMessage,
        sender_id: userId,
        created_at: new Date().toISOString(),
        sender_email: userEmail
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage("");
      
      // Add the temp ID to our processed set to prevent duplicates
      processedMessageIdsRef.current.add(tempId);
      
      // Send message to server
      const { data, error } = await supabase
        .from("private_messages")
        .insert({
          chat_id: id,
          sender_id: userId,
          content: newMessage
        })
        .select();

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Add the real message ID to our processed set
        processedMessageIdsRef.current.add(data[0].id);
        
        // Replace the temporary message with the real one
        setMessages(prev => 
          prev.map(msg => msg.id === tempId ? {
            id: data[0].id,
            content: data[0].content,
            sender_id: data[0].sender_id,
            created_at: data[0].created_at,
            read_at: data[0].read_at,
            sender_email: userEmail
          } as Message : msg)
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const goBack = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-900 via-blue-950 to-indigo-950 flex flex-col fixed inset-0">
      <Header unreadChats={0} userEmail={userEmail} />

      <div className="flex flex-col flex-grow mt-24 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 gap-4">
        <div className="max-w-4xl mx-auto w-full flex flex-col h-[calc(100vh-96px)]">
          {/* Chat Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[32px] bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)] p-3 flex items-center gap-3 z-10 sticky top-24 w-full"
          >
            {/* Prismatic edge effect */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
            
            <button
              onClick={goBack}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)]"
            >
              <ArrowLeft className="w-5 h-5 text-cyan-300" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-medium border border-cyan-500/20 shadow-md">
                {chatPartner?.email.charAt(0).toUpperCase() || "?"}
              </div>
              <div>
                <h2 className="font-semibold text-cyan-300">
                  {chatPartner?.email || "Loading..."}
                </h2>
                <p className="text-xs text-cyan-400">
                  {isLoading ? "Loading..." : "Online"}
                </p>
              </div>
            </div>

            <button className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] ml-auto">
              <MoreVertical className="w-5 h-5 text-cyan-300" />
            </button>
          </motion.div>

          {/* Chat Messages */}
          <div className="flex-grow overflow-y-auto p-4 w-full pb-20 flex flex-col space-y-1">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-pulse text-cyan-400">Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-10 text-cyan-400 relative overflow-hidden rounded-[32px] bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)] p-8">
                {/* Prismatic edge effect */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
                <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
                
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-3 border border-cyan-500/20 shadow-md">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <p className="font-medium text-cyan-300 text-lg">No messages yet</p>
                <p className="text-sm mt-1 text-cyan-400">Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                // Generate a consistent color based on the sender's ID
                const colorOptions = [
                  "from-cyan-500 to-blue-500",
                  "from-blue-500 to-cyan-600",
                  "from-teal-500 to-cyan-500",
                  "from-cyan-600 to-blue-600",
                  "from-blue-600 to-cyan-700",
                  "from-cyan-700 to-blue-700",
                  "from-blue-700 to-cyan-800",
                  "from-cyan-800 to-blue-800"
                ];
                
                // Use the sender ID to deterministically select a color
                const colorIndex = message.sender_id ? 
                  message.sender_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colorOptions.length : 0;
                
                const senderColor = colorOptions[colorIndex];
                
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full"
                  >
                    <div
                      className={`relative overflow-hidden w-full rounded-[24px] p-3 shadow-[0_4px_15px_rgba(31,38,135,0.15)] bg-gradient-to-r ${senderColor} text-white border border-cyan-500/20`}
                    >
                      {/* Prismatic edge effect */}
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-70" />
                      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/70 to-transparent opacity-70" />
                      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-50" />
                      
                      <div className="flex items-center mb-1">
                        <div className="flex-shrink-0 mr-2">
                          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-medium border border-white/20 shadow-md">
                            {message.sender_id === userId ? userEmail.charAt(0).toUpperCase() : message.sender_email?.charAt(0).toUpperCase() || "?"}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-white">
                          {message.sender_id === userId ? "You" : message.sender_email?.split('@')[0] || "Unknown"}
                        </span>
                        <div className="flex items-center ml-auto">
                          <span className="text-xs text-white/70">
                            {formatTime(message.created_at)}
                          </span>
                          {message.sender_id === userId && (
                            <span className="text-xs text-white/70 ml-2">
                              {message.read_at ? "Read" : "Sent"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm">{message.content}</div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 sticky bottom-0 w-full"
          >
            <form onSubmit={handleSendMessage} className="relative overflow-hidden rounded-full bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)] p-2 flex gap-2">
              {/* Prismatic edge effect */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
              
              <button
                type="button"
                className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-3 shadow-[0_2px_5px_rgba(31,38,135,0.1)]"
              >
                <Paperclip className="w-5 h-5 text-cyan-300" />
              </button>
              
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="bg-transparent flex-grow px-4 py-2 outline-none text-cyan-100 placeholder:text-cyan-500"
              />
              
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className={`relative overflow-hidden rounded-full ${
                  !newMessage.trim() ? "bg-cyan-800/30 opacity-50" : "bg-gradient-to-r from-cyan-500 to-blue-500"
                } p-3 border border-cyan-500/20 shadow-[0_2px_5px_rgba(31,38,135,0.1)]`}
              >
                <Send className={`w-5 h-5 ${!newMessage.trim() ? "text-cyan-300" : "text-white"}`} />
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}