import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Send, ArrowLeft, Paperclip, MoreVertical, Users, MessageSquare, X } from "lucide-react";
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
  sender_name?: string;
  sender_avatar?: string;
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
  
  // Debug: Log members whenever they change
  useEffect(() => {
    console.log("Members state updated:", members);
  }, [members]);
  
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
        console.log("Unique sender IDs:", senderIds);
        console.log("Messages data:", messagesData);
        
        // If there are no messages yet, we'll still need to show the current user
        let memberIds = [...senderIds]; // Create a new array to avoid modifying senderIds
        
        // Always include the current user's ID if authenticated
        if (userId && !memberIds.includes(userId)) {
          memberIds.push(userId);
        }
        
        console.log("Member IDs including current user:", memberIds);
        
        // Fetch profiles for all members in a single query
        let profilesData = null;
        let profilesError = null;
        
        if (memberIds.length > 0) {
          const response = await supabase
            .from("profiles")
            .select("id, email, avatar_url")
            .in("id", memberIds);
            
          profilesData = response.data;
          profilesError = response.error;
          console.log("Fetched profiles data:", profilesData);
        } else {
          // If no member IDs, we'll just create an empty array
          profilesData = [];
        }
        
        // Create maps for sender information lookup
        const senderEmailMap: Record<string, string> = {};
        const senderNameMap: Record<string, string> = {};
        const senderAvatarMap: Record<string, string> = {};
        
        // Create a map of user IDs to their full profile data for easy lookup
        const userProfileMap: Record<string, any> = {};
        
        profilesData?.forEach((profile: any) => {
          // Store the full profile in our map
          userProfileMap[profile.id] = profile;
          
          // Also maintain the individual field maps for backward compatibility
          senderEmailMap[profile.id] = profile.email || "";
          // Use email username as display name since name field doesn't exist
          senderNameMap[profile.id] = profile.email ? profile.email.split('@')[0] : "";
          senderAvatarMap[profile.id] = profile.avatar_url || "";
        });
        
        console.log("User profile map:", userProfileMap);
        
        // Format messages with sender information
        const formattedMessages = messagesData.map((msg: any) => {
          // Get the sender profile from our map
          const senderProfile = userProfileMap[msg.sender_id];
          console.log(`Sender profile for message ${msg.id}:`, senderProfile);
          
          // If sender profile is not found, log a warning
          if (!senderProfile) {
            console.warn(`Sender profile not found for message ${msg.id} with sender ID ${msg.sender_id}`);
          }
          
          // If we have the sender profile, use it; otherwise, use empty values
          const senderEmail = senderProfile?.email || "";
          // Use email username as display name since name field doesn't exist
          const senderName = senderProfile?.email ? senderProfile.email.split('@')[0] : "";
          const senderAvatar = senderProfile?.avatar_url || "";
          
          const formattedMessage = {
            id: msg.id,
            content: msg.content,
            sender_id: msg.sender_id,
            created_at: msg.created_at,
            sender_email: senderEmail,
            sender_name: senderName,
            sender_avatar: senderAvatar
          };
          
          console.log(`Formatted message ${msg.id}:`, formattedMessage);
          return formattedMessage;
        });
        
        console.log("Formatted messages with sender information:", formattedMessages);
        
        // Initialize processed message IDs in our ref
        processedMessageIdsRef.current = new Set(formattedMessages.map(msg => msg.id));
        
        setMessages(formattedMessages);
        
        // Fetch members of this group chat based on message senders and current user
        // This ensures we show users who have participated in the chat and the current user
        let membersData = null;
        let membersError = null;
        
        if (memberIds.length > 0) {
          const response = await supabase
            .from("profiles")
            .select("id, email, avatar_url")
            .in("id", memberIds);
            
          membersData = response.data;
          membersError = response.error;
        } else {
          // If no member IDs, we'll just create an empty array
          membersData = [];
        }
        
        console.log("Members data from senders:", membersData);
        
        if (membersError) throw membersError;
        
        // Add the current user to the members list if they're not already included
        let membersList: Member[] = membersData || [];
        const isCurrentUserInMembers = membersList.some(member => member.id === userId);
        console.log("Current user ID:", userId);
        console.log("Is current user in members:", isCurrentUserInMembers);
        
        if (!isCurrentUserInMembers && userId) {
          const { data: currentUserProfile, error: currentUserError } = await supabase
            .from("profiles")
            .select("id, email, avatar_url")
            .eq("id", userId);
            
          console.log("Current user profile:", currentUserProfile);
            
          if (!currentUserError && currentUserProfile && currentUserProfile.length > 0) {
            membersList = [...membersList, currentUserProfile[0]];
          }
        }
        
        // If we still have no members (which shouldn't happen since we added the current user),
        // make sure to add the current user profile
        if (membersList.length === 0 && userId) {
          const { data: currentUserProfile, error: currentUserError } = await supabase
            .from("profiles")
            .select("id, email, avatar_url")
            .eq("id", userId);
            
          if (!currentUserError && currentUserProfile && currentUserProfile.length > 0) {
            membersList = [currentUserProfile[0]];
          }
        }
        
        // Ensure members list has no duplicates
        const uniqueMemberIds = new Set();
        const uniqueMembers = membersList.filter(member => {
          if (uniqueMemberIds.has(member.id)) {
            return false; // Skip this member as it's a duplicate
          }
          uniqueMemberIds.add(member.id);
          return true;
        });
        
        console.log("Final members list:", uniqueMembers);
        setMembers(uniqueMembers);
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching group chat data:", error);
        setIsLoading(false);
      }
    };
    
    fetchGroupChatData();
    
    // Subscribe to new messages
    console.log(`Setting up real-time subscription for group chat: ${id}`);
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
          console.log("Received real-time message:", payload.new);
          
          // Skip if we've already processed this message
          if (processedMessageIdsRef.current.has(payload.new.id)) {
            console.log("Skipping already processed message:", payload.new.id);
            return;
          }
          
          // Add this message ID to our processed set
          processedMessageIdsRef.current.add(payload.new.id);
          
          try {
            // Fetch the sender's complete profile information
            const { data: senderData, error: senderError } = await supabase
              .from("profiles")
              .select("id, email, avatar_url")
              .eq("id", payload.new.sender_id);
            
            if (senderError) {
              console.error("Error fetching sender data:", senderError);
              return;
            }
            
            // Get the sender profile from the response
            const senderProfile = senderData && senderData.length > 0 ? senderData[0] : null;
            console.log("Sender profile for new message:", senderProfile);
            
            if (!senderProfile) {
              console.error("Sender profile not found for ID:", payload.new.sender_id);
              return;
            }
            
            // Extract sender information from the profile
            const senderEmail = senderProfile.email || "";
            // Use email username as display name since name field doesn't exist
            const senderName = senderEmail ? senderEmail.split('@')[0] : "";
            const senderAvatar = senderProfile.avatar_url || "";
            
            // Create the new message object with sender information
            const newMsg: Message = {
              id: payload.new.id,
              content: payload.new.content,
              sender_id: payload.new.sender_id,
              created_at: payload.new.created_at,
              sender_email: senderEmail,
              sender_name: senderName,
              sender_avatar: senderAvatar
            };
            
            // Check if this message is from the current user
            const isFromCurrentUser = newMsg.sender_id === userId;
            console.log("Is message from current user:", isFromCurrentUser);
            
            // Update messages state
            setMessages(prev => {
              // For messages from the current user, try to replace any temporary message
              if (isFromCurrentUser) {
                // Look for a temporary message with the same content
                const tempIndex = prev.findIndex(
                  msg => msg.id.startsWith('temp-') && 
                        msg.content === newMsg.content &&
                        msg.sender_id === userId
                );
                
                // If we found a matching temporary message, replace it
                if (tempIndex >= 0) {
                  console.log("Replacing temporary message at index:", tempIndex);
                  const newMessages = [...prev];
                  newMessages[tempIndex] = newMsg;
                  return newMessages;
                }
              }
              
              // Otherwise, just add the new message
              console.log("Adding new message to state");
              return [...prev, newMsg];
            });
            
            // Check if this sender is already in our members list
            // If not, add them to the members list
            setMembers(prevMembers => {
              const senderExists = prevMembers.some(member => member.id === payload.new.sender_id);
              console.log("Sender exists in members list:", senderExists);
              
              if (!senderExists) {
                // Fetch the complete profile of the new member
                supabase
                  .from("profiles")
                  .select("id, email, avatar_url")
                  .eq("id", payload.new.sender_id)
                  .then(({ data, error }) => {
                    if (!error && data && data.length > 0) {
                      console.log("Adding new member to state:", data[0]);
                      // Ensure we don't add duplicates by checking again before adding
                      setMembers(prev => {
                        // Check if this member already exists in the list
                        if (prev.some(member => member.id === data[0].id)) {
                          return prev; // Don't add if already exists
                        }
                        return [...prev, data[0]]; // Add if it's new
                      });
                    } else {
                      console.error("Error fetching new member profile:", error);
                    }
                  });
              }
              
              return prevMembers;
            });
          } catch (error) {
            console.error("Error processing real-time message:", error);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for group chat ${id}:`, status);
      });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [id, isAuthenticated, navigate, userId, userEmail]);
  
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
      
      // Find the current user's profile in the members list
      const currentUserProfile = members.find(member => member.id === userId);
      console.log("Current user profile from members:", currentUserProfile);
      
      if (!currentUserProfile) {
        console.warn("Current user profile not found in members list. Using fallback values.");
      }
      
      // Use profile data if available, otherwise fallback to basic info
      // Use email username as display name since name field doesn't exist
      const userName = currentUserProfile?.email ? currentUserProfile.email.split('@')[0] : userEmail.split('@')[0];
      const userAvatar = currentUserProfile?.avatar_url || "";
      
      console.log("Using sender name:", userName);
      console.log("Using sender avatar:", userAvatar);
      
      // Create a temporary local message to show immediately
      const tempId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        content: messageContent,
        sender_id: userId,
        sender_email: userEmail,
        sender_name: userName,
        sender_avatar: userAvatar,
        created_at: new Date().toISOString()
      };
      
      // Add the temporary message to the UI immediately
      setMessages(prev => [...prev, tempMessage]);
      
      // Scroll to bottom after adding the temporary message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      
      // Insert the message into the group_messages table
      const { data, error } = await supabase.from("group_messages").insert({
        group_id: id,
        sender_id: userId,
        content: messageContent
      }).select();
      
      if (error) {
        console.error("Error sending message:", error);
        return;
      }
      
      console.log("Message sent successfully:", data);
      
      if (data && data.length > 0) {
        // Replace the temporary message with the real one
        const realMessage: Message = {
          id: data[0].id,
          content: data[0].content,
          sender_id: data[0].sender_id,
          created_at: data[0].created_at,
          sender_email: userEmail,
          sender_name: userName,
          sender_avatar: userAvatar
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

      <div className="flex flex-row items-start gap-2 mt-24 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="flex-1 flex flex-col">
          <div className="max-w-4xl w-full flex flex-col h-[calc(100vh-96px)]">
            {/* Chat Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(124,58,237,0.1)] p-3 flex items-center gap-3 z-10 sticky top-24 w-full"
            >
              {/* Prismatic edge effect */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-70" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/70 to-transparent opacity-70" />
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-50" />
              
              <button
                onClick={goBack}
                className="relative overflow-hidden rounded-full bg-white/10 backdrop-blur-md border border-white/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)]"
              >
                <ArrowLeft className="w-5 h-5 text-sky-800" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-400 to-violet-600 flex items-center justify-center text-white font-semibold border border-white/20 shadow-md">
                  {groupInfo.name?.charAt(0).toUpperCase() || "G"}
                </div>
                <div>
                  <h2 className="font-semibold text-sky-900">
                    {groupInfo.name || "Loading..."}
                  </h2>
                  <p className="text-xs text-sky-700">
                    {isLoading ? "Loading..." : `${members.length} members`}
                  </p>
                </div>
              </div>

              {/* Only show the members toggle button on mobile */}
              {isMobile && (
                <button 
                  onClick={() => setShowMembers(!showMembers)}
                  className="relative overflow-hidden rounded-full bg-white/10 backdrop-blur-md border border-white/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] ml-auto"
                >
                  <Users className="w-5 h-5 text-sky-800" />
                </button>
              )}
            </motion.div>

            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto p-4 w-full pb-20 flex flex-col space-y-1">
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-pulse text-sky-700">Loading messages...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10 text-sky-700 relative overflow-hidden rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(124,58,237,0.1)] p-8">
                  {/* Prismatic edge effect */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-70" />
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                  <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/70 to-transparent opacity-70" />
                  <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-50" />
                  
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-md">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <p className="font-medium text-sky-900 text-lg">No messages yet</p>
                  <p className="text-sm mt-1 text-sky-700">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => {
                  // Generate a consistent color based on the sender's ID
                  const colorOptions = [
                    "from-pink-500 to-rose-500",
                    "from-orange-500 to-amber-500",
                    "from-green-500 to-emerald-500",
                    "from-teal-500 to-cyan-500",
                    "from-blue-500 to-indigo-500",
                    "from-indigo-500 to-purple-500",
                    "from-purple-500 to-fuchsia-500",
                    "from-rose-500 to-pink-500"
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
                        className={`relative overflow-hidden w-full rounded-[24px] p-3 shadow-[0_4px_15px_rgba(31,38,135,0.15)] bg-gradient-to-r ${senderColor} text-white border border-white/20`}
                      >
                        {/* Prismatic edge effect */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-70" />
                        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/70 to-transparent opacity-70" />
                        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-50" />
                        
                        <div className="flex items-center mb-1">
                          <div className="flex-shrink-0 mr-2">
                            {message.sender_avatar ? (
                              <img 
                                src={message.sender_avatar} 
                                alt={(message.sender_email || "").split('@')[0]} 
                                className="w-6 h-6 rounded-full object-cover border border-white/20 shadow-md"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-medium border border-white/20 shadow-md">
                                {(message.sender_email || "").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-medium text-white">
                            {message.sender_id === userId ? "You" : (message.sender_email || "").split('@')[0]}
                          </span>
                          <span className="text-xs ml-auto text-white/70">
                            {formatTime(message.created_at)}
                          </span>
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
              <form onSubmit={handleSendMessage} className="relative overflow-hidden rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(124,58,237,0.1)] p-2 flex gap-2">
                {/* Prismatic edge effect */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-70" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/70 to-transparent opacity-70" />
                <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-50" />
                
                <button
                  type="button"
                  className="relative overflow-hidden rounded-full bg-white/10 backdrop-blur-md border border-white/20 p-3 shadow-[0_2px_5px_rgba(31,38,135,0.1)]"
                >
                  <Paperclip className="w-5 h-5 text-sky-800" />
                </button>
                
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-transparent flex-grow px-4 py-2 outline-none text-sky-900 placeholder:text-sky-600"
                />
                
                <button
                  type="submit"
                  disabled={!newMessage.trim() || !userId}
                  className={`relative overflow-hidden rounded-full ${
                    !newMessage.trim() || !userId ? "bg-white/10 opacity-50" : "bg-gradient-to-r from-violet-500 to-violet-600"
                  } p-3 border border-white/20 shadow-[0_2px_5px_rgba(31,38,135,0.1)]`}
                >
                  <Send className={`w-5 h-5 ${!newMessage.trim() || !userId ? "text-sky-800" : "text-white"}`} />
                </button>
              </form>
            </motion.div>
          </div>
        </div>

        {/* Members List - Desktop (always visible) */}
        {!isMobile && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-1/4 h-fit sticky top-24"
          >
            <div className="relative overflow-hidden rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(124,58,237,0.1)] p-4 min-h-[200px] max-h-[calc(100vh-96px)] flex flex-col">
              {/* Prismatic edge effect */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-70" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/70 to-transparent opacity-70" />
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-50" />
              
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sky-900">Members ({members.length})</h3>
              </div>
              
              <div className="flex-grow overflow-y-auto space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-3 flex items-center gap-3 shadow-[0_2px_5px_rgba(31,38,135,0.1)]"
                  >
                    {/* Prismatic edge effect */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-70" />
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                    <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/70 to-transparent opacity-70" />
                    <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-50" />
                    
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold border border-white/20 shadow-md">
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sky-900 truncate">{member.email}</p>
                      <p className="text-xs text-sky-700">
                        {member.id === userId ? "You" : "Member"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Members List - Mobile (toggleable) */}
        {isMobile && showMembers && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-0 z-50 p-4 flex items-end"
          >
            <div className="relative overflow-hidden rounded-t-[32px] bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(124,58,237,0.1)] p-4 min-h-[300px] max-h-[80vh] w-full flex flex-col">
              {/* Prismatic edge effect */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-70" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/70 to-transparent opacity-70" />
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-50" />
              
              {/* Drag indicator */}
              <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mb-4"></div>
              
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sky-900">Members ({members.length})</h3>
                <button
                  onClick={() => setShowMembers(false)}
                  className="relative overflow-hidden rounded-full bg-white/10 backdrop-blur-md border border-white/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)]"
                >
                  <X className="w-5 h-5 text-sky-800" />
                </button>
              </div>
              
              <div className="flex-grow overflow-y-auto space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-3 flex items-center gap-3 shadow-[0_2px_5px_rgba(31,38,135,0.1)]"
                  >
                    {/* Prismatic edge effect */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-70" />
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                    <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/70 to-transparent opacity-70" />
                    <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-50" />
                    
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold border border-white/20 shadow-md">
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sky-900 truncate">{member.email}</p>
                      <p className="text-xs text-sky-700">
                        {member.id === userId ? "You" : "Member"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
} 