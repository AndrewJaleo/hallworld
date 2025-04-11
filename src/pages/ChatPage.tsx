import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { Send, ArrowLeft, Paperclip, MoreVertical, MessageSquare, X, User, Video, Zap, Image } from "lucide-react";
import { useBuzzNotification } from '../lib/BuzzNotificationProvider';
import { VideoCallModal } from '../components/VideoCallModal';
import { v4 as uuidv4 } from 'uuid';

interface BuzzUsage {
  user_id: string;
  count: number;
  last_updated: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_email?: string;
  read_at?: string | null;
  is_buzz?: boolean;
  image_url?: string | null;
}

interface ChatUser {
  id: string;
  email: string;
  avatar_url?: string;
  username?: string;
}

// Add ProfileModal component
interface ProfileModalProps {
  user: ChatUser;
  isOpen: boolean;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
}

// Add ImagePreviewModal component
interface ImagePreviewModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

function ImagePreviewModal({
  imageUrl,
  isOpen,
  onClose
}: ImagePreviewModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with flex centering */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative overflow-hidden rounded-[32px] bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)] w-full max-w-4xl p-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Prismatic edge effect */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 text-cyan-300 hover:bg-cyan-700/30 transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Image */}
              <div className="flex items-center justify-center max-h-[80vh] overflow-hidden rounded-[24px]">
                <img
                  src={imageUrl}
                  alt="Full size preview"
                  className="max-w-full max-h-[80vh] object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ProfileModal({
  user,
  isOpen,
  onClose,
  onViewProfile
}: ProfileModalProps) {
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
      'from-cyan-400 to-cyan-600',
      'from-blue-400 to-blue-600',
      'from-indigo-400 to-indigo-600',
      'from-teal-400 to-teal-600',
      'from-emerald-400 to-emerald-600',
      'from-green-400 to-green-600',
      'from-amber-400 to-amber-600',
      'from-orange-400 to-orange-600',
      'from-rose-400 to-rose-600',
      'from-pink-400 to-pink-600'
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
              className="relative overflow-hidden rounded-[32px] bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)] w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Prismatic edge effect */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 text-cyan-300 hover:bg-cyan-700/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* User info */}
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className={`w-24 h-24 rounded-full bg-gradient-to-r ${getRandomColor(user.id)} flex items-center justify-center text-white text-3xl font-semibold mb-4 border-2 border-white/30 shadow-lg`}>
                  {getInitials(user.email)}
                </div>

                {/* Name */}
                <h3 className="text-xl font-semibold text-cyan-300 mb-1">
                  {user.email.split('@')[0]}
                </h3>

                {/* Email */}
                <p className="text-cyan-400 mb-6">
                  {user.email}
                </p>

                {/* Actions */}
                <div className="w-full">
                  <button
                    onClick={() => onViewProfile(user.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 text-cyan-300 hover:bg-cyan-700/30 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Ver Perfil Completo</span>
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

export function ChatPage() {
  const { id } = useParams({ from: "/layout/chat/$id" });
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [chatPartner, setChatPartner] = useState<ChatUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showBuzzAnimation, setShowBuzzAnimation] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [buzzUsageToday, setBuzzUsageToday] = useState<number>(0);
  const [buzzLimitReached, setBuzzLimitReached] = useState<boolean>(false);
  const BUZZ_DAILY_LIMIT = 5;
  const { showBuzz } = useBuzzNotification();
  const { video } = useSearch({ from: "/layout/chat/$id" });
  const [isVideoCallActive, setIsVideoCallActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState<boolean>(false);
  const [previewedImage, setPreviewedImage] = useState<string>("");

  const checkBuzzLimit = async (userId: string) => {
    try {
      // Get the current date in YYYY-MM-DD format for tracking daily usage
      const today = new Date().toISOString().split('T')[0];

      console.log("Checking buzz usage for user", userId, "on date", today);

      // Modificación: Usar .select() en lugar de .single()
      const { data, error } = await supabase
        .from("buzz_usage")
        .select("*")
        .eq("user_id", userId)
        .eq("date", today);

      if (error) {
        console.error("Error fetching buzz usage:", error);
        return 0;
      }

      // Si no hay registros o el array está vacío, crear uno
      if (!data || data.length === 0) {
        console.log("No buzz usage record found for today, creating one");

        const { error: insertError } = await supabase
          .from("buzz_usage")
          .insert({
            user_id: userId,
            date: today,
            count: 0
          });

        if (insertError) {
          console.error("Error creating buzz usage record:", insertError);
        }

        setBuzzUsageToday(0);
        setBuzzLimitReached(false);
        return 0;
      }

      console.log("Found buzz usage record:", data[0]);

      // Update state with current usage
      setBuzzUsageToday(data[0].count);
      setBuzzLimitReached(data[0].count >= BUZZ_DAILY_LIMIT);

      return data[0].count;
    } catch (error) {
      console.error("Error checking buzz limit:", error);
      return 0;
    }
  };

  // Auto-start video call if coming from a call notification
  useEffect(() => {
    if (video === 'true' && chatPartner) {
      setIsVideoCallActive(true);
    }
  }, [video, chatPartner]);

  // Modificar el useEffect que obtiene la sesión del usuario
  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || "");
        setUserId(session.user.id);

        // Check buzz limit when user ID is available
        const usageCount = await checkBuzzLimit(session.user.id);
        console.log("Initial buzz usage count:", usageCount);

      } else {
        navigate({ to: "/" });
      }
    });
  }, [navigate]);

  // Función mejorada para manejar la animación de vibración
  const shakeScreen = () => {
    console.log("Shake screen triggered"); // Para depuración

    // Vibrar el dispositivo si es compatible (dispositivos móviles)
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Aplicar la animación de vibración
    setShowBuzzAnimation(true);

    // Reproducir un sonido de notificación (opcional)
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Error playing sound', e));
    } catch (e) {
      console.log('Error with audio', e);
    }

    // Ocultar la animación después de 1 segundo
    setTimeout(() => {
      setShowBuzzAnimation(false);
    }, 1000);
  };

  const handleBuzz = async () => {
    try {
      // Check if user has reached the daily limit
      if (buzzLimitReached) {
        alert(`Has alcanzado el límite diario de ${BUZZ_DAILY_LIMIT} zumbidos. Inténtalo de nuevo mañana.`);
        return;
      }

      // Mostrar la animación de zumbido para el remitente
      shakeScreen();

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // Calculate new count
      const newCount = buzzUsageToday + 1;

      console.log("Sending buzz message...");

      // Primero enviar el mensaje de zumbido
      const { data: messageData, error: messageError } = await supabase
        .from("private_messages")
        .insert({
          chat_id: id,
          sender_id: userId,
          content: "🔔 BUZZ! 🔔",
          is_buzz: true
        })
        .select();

      if (messageError) {
        console.error("Error inserting buzz message:", messageError);
        throw messageError;
      }

      console.log("Buzz message sent successfully:", messageData);

      // Actualizar el contador en la tabla buzz_usage
      // Primero verificamos si existe un registro para hoy
      const { data: existingData, error: checkError } = await supabase
        .from("buzz_usage")
        .select("*")
        .eq("user_id", userId)
        .eq("date", today)
        .single();

      if (checkError && checkError.code !== 'PGNF') {
        console.error("Error checking existing buzz usage:", checkError);
        throw checkError;
      }

      let updateResult;

      // Si no existe un registro, lo creamos
      if (!existingData) {
        console.log("No existing record found, creating new one with count 1");
        updateResult = await supabase
          .from("buzz_usage")
          .insert({
            user_id: userId,
            date: today,
            count: 1
          });
      } else {
        // Si existe, actualizamos el contador
        console.log("Existing record found with count", existingData.count, "updating to", newCount);
        updateResult = await supabase
          .from("buzz_usage")
          .update({ count: newCount })
          .eq("id", existingData.id);
      }

      if (updateResult.error) {
        console.error("Error updating buzz usage:", updateResult.error);
        throw updateResult.error;
      }

      console.log("Buzz usage updated successfully");

      // Update local state
      setBuzzUsageToday(newCount);
      setBuzzLimitReached(newCount >= BUZZ_DAILY_LIMIT);

    } catch (error) {
      console.error("Error sending buzz:", error);

      // Mostrar un mensaje de error más específico si es posible
      if (error && typeof error === 'object' && 'message' in error) {
        alert(`Error al actualizar el contador de zumbidos: ${error.message}`);
      } else {
        alert("Error al enviar el zumbido. Por favor, inténtalo de nuevo.");
      }
    }
  };

  // Función para manejar la selección de archivos
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Función para manejar el cambio en el input de archivo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Verificar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona un archivo de imagen válido.');
      return;
    }

    // Verificar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande. El tamaño máximo es 5MB.');
      return;
    }

    // Crear una URL para previsualizar la imagen
    const previewUrl = URL.createObjectURL(file);
    setPreviewImage(previewUrl);

    // Subir la imagen cuando se selecciona
    await uploadImage(file);

    // Limpiar el input de archivo para permitir seleccionar el mismo archivo nuevamente
    e.target.value = '';
  };

  // Función para subir la imagen a Supabase Storage
  const uploadImage = async (file: File) => {
    if (!userId || !id) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Generar un nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `chat_images/${id}/${fileName}`;

      // Subir el archivo a Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat_attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });

      if (error) {
        throw error;
      }

      // Obtener la URL pública del archivo
      const { data: urlData } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(filePath);

      // Enviar mensaje con la imagen
      await sendImageMessage(urlData.publicUrl);

      // Limpiar la previsualización
      setPreviewImage(null);

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen. Por favor, inténtalo de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  // Función para enviar un mensaje con imagen
  const sendImageMessage = async (imageUrl: string) => {
    try {
      // Crear un ID temporal para actualización optimista
      const tempId = `temp-${Date.now()}`;

      // Añadir mensaje a la UI inmediatamente (actualización optimista)
      const tempMessage: Message = {
        id: tempId,
        content: '📷 Imagen',
        sender_id: userId,
        created_at: new Date().toISOString(),
        sender_email: userEmail,
        image_url: imageUrl
      };

      setMessages(prev => [...prev, tempMessage]);

      // Añadir el ID temporal a nuestro conjunto para evitar duplicados
      processedMessageIdsRef.current.add(tempId);

      // Enviar mensaje al servidor
      const { data, error } = await supabase
        .from("private_messages")
        .insert({
          chat_id: id,
          sender_id: userId,
          content: '📷 Imagen',
          image_url: imageUrl
        })
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        // Añadir el ID real del mensaje a nuestro conjunto
        processedMessageIdsRef.current.add(data[0].id);

        // Reemplazar el mensaje temporal con el real
        setMessages(prev =>
          prev.map(msg => msg.id === tempId ? {
            id: data[0].id,
            content: data[0].content,
            sender_id: data[0].sender_id,
            created_at: data[0].created_at,
            read_at: data[0].read_at,
            sender_email: userEmail,
            image_url: data[0].image_url
          } as Message : msg)
        );
      }
    } catch (error) {
      console.error("Error sending image message:", error);
      alert('Error al enviar la imagen. Por favor, inténtalo de nuevo.');
    }
  };

  // Función para cancelar la carga de la imagen
  const cancelImageUpload = () => {
    setPreviewImage(null);
    setIsUploading(false);
  };

  // Función para abrir la previsualización de imagen a tamaño completo
  const openImagePreview = (imageUrl: string) => {
    setPreviewedImage(imageUrl);
    setShowImagePreview(true);
  };

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

          if (userError) {
            console.error("Error fetching user data:", userError);
            throw userError;
          }

          console.log("Chat partner data:", userData); // Añadir este log para depuración
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
            read_at,
            is_buzz,
            image_url
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
          is_buzz: msg.is_buzz,
          image_url: msg.image_url,
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

    console.log("Fetching chat details for userId:", userId, "and chatId:", id);
    fetchChatDetails();

    // En el useEffect que configura la suscripción
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
          console.log("New message received:", payload.new);
          console.log("Is buzz field value:", payload.new.is_buzz);
          console.log("Is buzz type:", typeof payload.new.is_buzz);

          // Skip if we've already processed this message
          if (processedMessageIdsRef.current.has(payload.new.id)) {
            console.log("Message already processed, skipping");
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

          const newMsg = {
            id: payload.new.id,
            content: payload.new.content,
            sender_id: payload.new.sender_id,
            created_at: payload.new.created_at,
            read_at: payload.new.read_at,
            is_buzz: Boolean(payload.new.is_buzz),  // Convertir explícitamente a booleano
            image_url: payload.new.image_url,
            sender_email: senderData?.email || ""
          };

          setMessages((prev) => [...prev, newMsg]);

          // IMPORTANTE: Verificar explícitamente si es un mensaje de zumbido
          // y si proviene del otro usuario (no del usuario actual)
          console.log("Checking if buzz message:",
            "is_buzz =", payload.new.is_buzz,
            "sender_id =", payload.new.sender_id,
            "userId =", userId);

          // Usar una comparación más robusta para is_buzz
          const isBuzzMessage = payload.new.is_buzz === true ||
            payload.new.is_buzz === 'true' ||
            payload.new.is_buzz === 1;

          if (isBuzzMessage && payload.new.sender_id !== userId) {
            console.log("Buzz message received from other user, triggering shake");

            // Aquí es donde deberías usar showBuzz para mostrar la notificación global
            showBuzz(payload.new.sender_id, senderData?.email || "Usuario");

            // Reproducir un sonido de notificación
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(e => console.log('Error playing sound', e));
            } catch (e) {
              console.log('Error with audio', e);
            }

            // Vibrar el dispositivo si es compatible
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 200]);
            }

            // Activar la animación de vibración
            setShowBuzzAnimation(true);

            // Ocultar la animación después de 1 segundo
            setTimeout(() => {
              setShowBuzzAnimation(false);
            }, 1000);
          }

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
  }, [id, showBuzz, userId]);

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

  const handleViewProfile = (userId: string) => {
    // Close the modal
    setShowProfileModal(false);

    // Navigate to profile page
    navigate({ to: `/profile/${userId}` });
  };

  const handleVideoCall = () => {
    if (!chatPartner) {
      alert("Cannot start a video call without a chat partner.");
      return;
    }

    setIsVideoCallActive(true);
  };

  const handleEndCall = () => {
    setIsVideoCallActive(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-900 via-blue-950 to-indigo-950 flex flex-col fixed inset-0">
      {/* Profile Modal */}
      {chatPartner && (
        <ProfileModal
          user={chatPartner}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onViewProfile={handleViewProfile}
        />
      )}

      {/* Video Call Modal */}
      {chatPartner && (
        <VideoCallModal
          isOpen={isVideoCallActive}
          onClose={handleEndCall}
          chatId={id}
          userId={userId}
          partnerId={chatPartner.id}
          partnerName={chatPartner.username || chatPartner.email.split('@')[0]}
        />
      )}

      {/* Image Preview Modal */}
      <ImagePreviewModal
        imageUrl={previewedImage}
        isOpen={showImagePreview}
        onClose={() => setShowImagePreview(false)}
      />

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div
        ref={chatContainerRef}
        className={`flex flex-col flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 gap-4 ${showBuzzAnimation ? 'animate-buzz' : ''}`}
      >
        {/* Buzz Animation */}
        {showBuzzAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{
                scale: [0.5, 1.2, 0.8, 1.1, 0.9, 1],
                rotate: [-10, 10, -5, 5, 0],
                x: [-20, 20, -10, 10, 0],
                y: [-10, 10, -5, 5, 0]
              }}
              transition={{ duration: 0.8 }}
              className="text-7xl text-yellow-400 font-bold drop-shadow-[0_0_10px_rgba(250,204,21,0.7)]"
            >
              ¡ZUMBIDO!
            </motion.div>
          </motion.div>
        )}
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-medium border border-cyan-500/20 shadow-md">
                {chatPartner?.email?.charAt(0).toUpperCase() || "?"}
              </div>
              <div>
                <h2 className="font-semibold text-cyan-300">
                  {isLoading
                    ? "Loading..."
                    : chatPartner
                      ? chatPartner.email.split('@')[0]
                      : "No User Found"}
                </h2>
              </div>
            </div>


            {/* Video Call Button */}
            <button
              onClick={handleVideoCall}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2.5 shadow-[0_2px_5px_rgba(31,38,135,0.1)] ml-auto"
              title="Video Call"
            >
              <Video className="w-5 h-5 text-cyan-300" />
            </button>

            <button
              onClick={handleBuzz}
              disabled={buzzLimitReached}
              className={`flex gap-1 relative overflow-hidden rounded-full ${buzzLimitReached
                ? "bg-gray-600/30 cursor-not-allowed"
                : "bg-cyan-800/30 hover:bg-cyan-700/30"
                } backdrop-blur-md border border-cyan-500/20 p-2.5 shadow-[0_2px_5px_rgba(31,38,135,0.1)] group`}
              title={buzzLimitReached
                ? `Límite diario alcanzado (${BUZZ_DAILY_LIMIT}/${BUZZ_DAILY_LIMIT})`
                : `Enviar Zumbido (${buzzUsageToday}/${BUZZ_DAILY_LIMIT})`}
            >
              <Zap className={`w-5 h-5 ${buzzLimitReached ? "text-gray-400" : "text-yellow-400"}`} />

              {/* Optional: Add a small badge showing remaining buzzes */}
              <span className="bg-yellow-500 text-xs text-black font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {BUZZ_DAILY_LIMIT - buzzUsageToday}
              </span>
            </button>

            <button
              onClick={() => setShowProfileModal(true)}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2.5 shadow-[0_2px_5px_rgba(31,38,135,0.1)]"
            >
              <MoreVertical className="w-5 h-5 text-cyan-300" />
            </button>
          </motion.div>

          {/* Chat Messages */}
          <div className="flex-grow overflow-y-auto p-4 w-full pt-28 flex flex-col space-y-1">
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
                  "from-blue-500 to-indigo-500",
                  "from-indigo-500 to-purple-500",
                  "from-purple-500 to-pink-500",
                  "from-pink-500 to-rose-500",
                  "from-rose-500 to-red-500",
                  "from-red-500 to-orange-500",
                  "from-orange-500 to-amber-500",
                  "from-amber-500 to-yellow-500",
                  "from-yellow-500 to-lime-500",
                  "from-lime-500 to-green-500",
                  "from-green-500 to-emerald-500",
                  "from-emerald-500 to-teal-500",
                  "from-teal-500 to-cyan-500"
                ];

                const colorIndex = message.id ?
                  message.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colorOptions.length : 0;

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

                      {/* Contenido del mensaje */}
                      <div className="text-sm">
                        {/* Si hay una imagen, mostrarla */}
                        {message.image_url && (
                          <div className="mb-2 mt-1">
                            <div
                              className="relative overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => openImagePreview(message.image_url!)}
                            >
                              <img
                                src={message.image_url}
                                alt="Shared image"
                                className="max-w-full max-h-60 object-contain bg-black/20 rounded-lg"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center p-2">
                                <span className="text-xs text-white font-medium">Ver imagen completa</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Texto del mensaje */}
                        {message.content}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Image Preview (if uploading) */}
          {previewImage && (
            <div className="p-3 w-full">
              <div className="relative overflow-hidden rounded-[24px] bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)] p-4">
                {/* Prismatic edge effect */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
                <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />

                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-cyan-300 font-medium">Image Preview</h3>
                  <button
                    onClick={cancelImageUpload}
                    className="p-1 rounded-full bg-red-600/30 hover:bg-red-600/50 text-red-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="max-w-full max-h-40 object-contain mx-auto"
                  />

                  {/* Upload progress overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                      <div className="w-full max-w-xs bg-cyan-900/50 rounded-full h-2.5 mb-2">
                        <div
                          className="bg-cyan-500 h-2.5 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-cyan-300">{uploadProgress}% Uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Message Input */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-0 md:m-0 py-7 md:-mb-28 sticky md:bottom-0 md:-mt-20 bottom-16 mx-auto w-full z-50"
          >
            <form onSubmit={handleSendMessage} className="relative overflow-hidden rounded-full bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)] p-2 flex gap-2">
              {/* Prismatic edge effect */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />

              <button
                type="button"
                onClick={handleFileSelect}
                className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-3 shadow-[0_2px_5px_rgba(31,38,135,0.1)] hover:bg-cyan-700/30 transition-colors"
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Paperclip className="w-5 h-5 text-cyan-300" />
                )}
              </button>

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="bg-transparent flex-grow px-4 py-2 outline-none text-cyan-100 placeholder:text-cyan-500"
                disabled={isUploading}
              />

              <button
                type="submit"
                disabled={!newMessage.trim() || isUploading}
                className={`relative overflow-hidden rounded-full ${!newMessage.trim() || isUploading ? "bg-cyan-800/30 opacity-50" : "bg-gradient-to-r from-cyan-500 to-blue-500"
                  } p-3 border border-cyan-500/20 shadow-[0_2px_5px_rgba(31,38,135,0.1)]`}
              >
                <Send className={`w-5 h-5 ${!newMessage.trim() || isUploading ? "text-cyan-300" : "text-white"}`} />
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}