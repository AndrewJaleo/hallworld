import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { Header } from "../components/Header";
import { Send, ArrowLeft, Paperclip, MoreVertical } from "lucide-react";

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-sky-400 via-blue-500 to-indigo-500 flex flex-col fixed inset-0">
      <Header unreadChats={0} userEmail={userEmail} />

      <div className="flex flex-col flex-grow mt-20 relative">
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-400 to-violet-600 flex items-center justify-center text-white font-semibold">
              {chatPartner?.email.charAt(0).toUpperCase() || "?"}
            </div>
            <div>
              <h2 className="font-semibold text-sky-900">
                {chatPartner?.email || "Loading..."}
              </h2>
              <p className="text-xs text-sky-700">
                {isLoading ? "Loading..." : "Online"}
              </p>
            </div>
          </div>

          <button className="glass-button p-2 rounded-full ml-auto">
            <MoreVertical className="w-5 h-5 text-sky-800" />
          </button>
        </motion.div>

        {/* Chat Messages */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-pulse text-sky-700">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
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
                  message.sender_id === userId ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs sm:max-w-md rounded-xl p-3 ${
                    message.sender_id === userId
                      ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white"
                      : "glossy text-sky-900"
                  }`}
                >
                  <div className="text-sm">{message.content}</div>
                  <div className="flex items-center justify-between mt-1">
                    <div
                      className={`text-xs ${
                        message.sender_id === userId ? "text-violet-200" : "text-sky-700"
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </div>
                    
                    {message.sender_id === userId && (
                      <div className="text-xs text-violet-200 ml-2">
                        {message.read_at ? "Read" : "Sent"}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 sticky bottom-0"
        >
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <button
              type="button"
              className="glass-button p-3 rounded-full"
            >
              <Paperclip className="w-5 h-5 text-sky-800" />
            </button>
            
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="glass-input flex-grow px-4 py-3 rounded-xl"
            />
            
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className={`glass-button p-3 rounded-full ${
                !newMessage.trim() ? "opacity-50" : ""
              }`}
            >
              <Send className="w-5 h-5 text-sky-800" />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}