import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Send, ArrowLeft, Paperclip, MoreVertical, Users } from "lucide-react";
import { Header } from "../components/Header";
import { supabase } from "../lib/supabase";
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

interface GroupChat {
  id: string;
  name: string;
  category: string;
  city: string;
  type: string;
}

export function GroupChatPage() {
  const { id } = useParams({ from: '/group-chat/$id' });
  const navigate = useNavigate();
  
  // User state
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [groupInfo, setGroupInfo] = useState<GroupChat | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 1024 });
  
  // Use a ref to track message IDs to prevent duplicates
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  
  // Get current user and authenticate
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || "");
        setUserId(session.user.id);
        setIsAuthenticated(true);
      } else {
        // Redirect to login if not authenticated
        navigate({ to: "/" });
      }
    });
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          setUserEmail(session.user.email || "");
          setUserId(session.user.id);
          setIsAuthenticated(true);
        } else if (event === "SIGNED_OUT") {
          navigate({ to: "/" });
        }
      }
    );
    
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate]);
  
  // Fetch group chat data and messages
  useEffect(() => {
    if (!id || !isAuthenticated) return;
    
    const fetchGroupChatData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch group chat info
        const { data: chatData, error: chatError } = await supabase
          .from("group_chats")
          .select("*")
          .eq("id", id)
          .single();
        
        if (chatError) throw chatError;
        setGroupInfo(chatData);
        
        // Fetch messages for this group chat without trying to join with profiles
        const { data: messagesData, error: messagesError } = await supabase
          .from("group_messages")
          .select("id, content, sender_id, created_at")
          .eq("group_id", id)
          .order("created_at", { ascending: true });
        
        if (messagesError) throw messagesError;
        
        // Get unique sender IDs from messages
        const senderIds = [...new Set(messagesData.map((msg: any) => msg.sender_id))];
        
        // Fetch profiles for all senders in a single query
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", senderIds);
          
        if (profilesError) throw profilesError;
        
        // Create a map of sender_id to email for quick lookup
        const senderEmailMap: Record<string, string> = {};
        profilesData?.forEach((profile: any) => {
          senderEmailMap[profile.id] = profile.email;
        });
        
        // Format messages with sender email
        const formattedMessages = messagesData.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          created_at: msg.created_at,
          sender_email: senderEmailMap[msg.sender_id] || ""
        }));
        
        // Initialize processed message IDs in our ref
        processedMessageIdsRef.current = new Set(formattedMessages.map(msg => msg.id));
        
        setMessages(formattedMessages);
        
        // Fetch members of this group chat
        const { data: membersData, error: membersError } = await supabase
          .from("profiles")
          .select("id, email, avatar_url")
          .order("email", { ascending: true })
          .limit(20); // Limit to 20 members for now
        
        if (membersError) throw membersError;
        setMembers(membersData || []);
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching group chat data:", error);
        setIsLoading(false);
      }
    };
    
    fetchGroupChatData();
    
    // Subscribe to new messages
    const subscription = supabase
      .channel(`group-chat:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${id}`
        },
        async (payload) => {
          console.log("Realtime message received:", payload.new);
          
          // If we already have this message ID in our processed set, ignore it
          if (processedMessageIdsRef.current.has(payload.new.id)) {
            console.log(`Ignoring already processed message: ${payload.new.id}`);
            return;
          }
          
          // Get sender email separately
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", payload.new.sender_id)
            .single();
          
          if (profileError) {
            console.error("Error fetching sender profile:", profileError);
          }
          
          const newMsg: Message = {
            id: payload.new.id,
            content: payload.new.content,
            sender_id: payload.new.sender_id,
            created_at: payload.new.created_at,
            sender_email: profileData?.email || ""
          };
          
          // Add the message ID to our processed set
          processedMessageIdsRef.current.add(newMsg.id);
          
          // Check if this message is from the current user
          const isFromCurrentUser = newMsg.sender_id === userId;
          
          // Check if we have a temporary message with the same content
          if (isFromCurrentUser) {
            setMessages(prev => {
              // Look for a temporary message with the same content
              const tempIndex = prev.findIndex(
                msg => msg.id.startsWith('temp-') && 
                      msg.content === newMsg.content &&
                      msg.sender_id === userId
              );
              
              // If we found a matching temporary message, replace it
              if (tempIndex >= 0) {
                const newMessages = [...prev];
                newMessages[tempIndex] = newMsg;
                return newMessages;
              }
              
              // Otherwise, just add the new message
              return [...prev, newMsg];
            });
          } else {
            // For messages from other users, just add them
            setMessages(prev => [...prev, newMsg]);
          }
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [id, isAuthenticated, navigate, userId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId) return;
    
    // Store the message content and clear input immediately for better UX
    const messageContent = newMessage;
    setNewMessage("");
    
    try {
      console.log("Sending message:", messageContent);
      
      // Create a temporary local message to show immediately
      const tempId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        content: messageContent,
        sender_id: userId,
        sender_email: userEmail,
        created_at: new Date().toISOString()
      };
      
      // Add the temporary message to the UI immediately
      setMessages(prev => [...prev, tempMessage]);
      
      // Insert the message into the group_messages table
      const { data, error } = await supabase.from("group_messages").insert({
        group_id: id,
        sender_id: userId,
        content: messageContent
      }).select();
      
      if (error) throw error;
      
      console.log("Message sent successfully:", data);
      
      if (data && data.length > 0) {
        // Replace the temporary message with the real one
        const realMessage: Message = {
          id: data[0].id,
          content: data[0].content,
          sender_id: data[0].sender_id,
          created_at: data[0].created_at,
          sender_email: userEmail
        };
        
        // Add the real message ID to our processed set to prevent duplicates from realtime
        processedMessageIdsRef.current.add(realMessage.id);
        
        // Replace the temporary message with the real one
        setMessages(prev => 
          prev.map(msg => msg.id === tempId ? realMessage : msg)
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      // If there was an error, keep the temporary message as is
      // It will at least show the user their message was sent locally
    }
    
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-sky-400 via-blue-500 to-indigo-500 flex items-center justify-center">
        <div className="text-white">Loading group chat...</div>
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-sky-400 via-blue-500 to-indigo-500 flex items-center justify-center">
        <div className="text-white">Group not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-sky-400 via-blue-500 to-indigo-500 flex flex-col fixed inset-0">
      <Header unreadChats={0} userEmail={userEmail} />

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
                  {groupInfo.city} • Group Chat
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
                    {message.sender_id !== userId && (
                      <div className="text-xs text-sky-600 mb-1">
                        {message.sender_email}
                      </div>
                    )}
                    <div className="text-sm">{message.content}</div>
                    <div
                      className={`text-xs mt-1 ${
                        message.sender_id === userId ? "text-violet-200" : "text-sky-700"
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
                disabled={!newMessage.trim() || !isAuthenticated}
                className={`glass-button p-2 rounded-full ${
                  newMessage.trim() && isAuthenticated ? "bg-gradient-to-r from-violet-500 to-violet-600" : "opacity-50"
                }`}
              >
                <Send className={`w-5 h-5 ${newMessage.trim() && isAuthenticated ? "text-white" : "text-sky-800"}`} />
              </button>
            </form>
          </motion.div>
        </div>

        {/* Members List */}
        <MembersList
          isOpen={isMobile ? showMembers : true}
          onClose={() => setShowMembers(false)}
          members={members}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
} 