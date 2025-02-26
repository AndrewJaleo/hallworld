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
}

interface ChatUser {
  id: string;
  email: string;
  avatar_url?: string;
}

export function ChatPage() {
  const { id } = useParams({ from: "/chat/:id" });
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [chatPartner, setChatPartner] = useState<ChatUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Get chat details
    const fetchChatDetails = async () => {
      try {
        // Fetch the chat to get the other user's ID
        const { data: chatData, error: chatError } = await supabase
          .from("chats")
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
          .from("messages")
          .select(`
            id,
            content,
            sender_id,
            created_at,
            profiles(email)
          `)
          .eq("chat_id", id)
          .order("created_at", { ascending: true });

        if (messagesError) throw messagesError;

        // Format messages with sender email
        const formattedMessages = messagesData.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          created_at: msg.created_at,
          sender_email: msg.profiles?.email || ""
        }));

        setMessages(formattedMessages);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching chat details:", error);
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchChatDetails();
    }

    // Subscribe to new messages
    const subscription = supabase
      .channel(`chat:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${id}`
        },
        async (payload) => {
          // Get sender email
          const { data } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new,
            sender_email: data?.email || ""
          };

          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id, userId, navigate]);

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
      const { error } = await supabase.from("messages").insert({
        chat_id: id,
        sender_id: userId,
        content: newMessage
      });

      if (error) throw error;
      setNewMessage("");
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
    </div>
  );
}