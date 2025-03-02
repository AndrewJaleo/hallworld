import { supabase } from './supabase';

export async function getOrCreateGroupChat(category: string, city: string) {
  // First, try to find an existing group chat
  const { data: existingChat, error: searchError } = await supabase
    .from('group_chats')
    .select('id')
    .eq('category', category)
    .eq('city', city)
    .single();

  if (searchError && searchError.code !== 'PGRST116') { // PGRST116 is "not found"
    throw searchError;
  }

  if (existingChat) {
    return existingChat.id;
  }

  // If no existing chat, create a new one
  const { data: newChat, error: createError } = await supabase
    .from('group_chats')
    .insert({
      category,
      city,
      type: 'hall',
      name: `HALL ${category} - ${city}`
    })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  return newChat.id;
}

/**
 * Get or create a topic-based group chat
 * @param topicId The ID of the topic (e.g., 'politica', 'ligar', etc.)
 * @param city The city for the group chat
 * @returns The ID of the group chat
 */
export async function getOrCreateTopicGroupChat(topicId: string, city: string) {
  // First, try to find an existing topic group chat
  const { data: existingChat, error: searchError } = await supabase
    .from('group_chats')
    .select('id')
    .eq('category', topicId)
    .eq('city', city)
    .eq('type', 'topic')
    .single();

  if (searchError && searchError.code !== 'PGRST116') { // PGRST116 is "not found"
    throw searchError;
  }

  if (existingChat) {
    return existingChat.id;
  }

  // Format the topic name for display
  const topicNameMap: Record<string, string> = {
    'politica': 'Política',
    'ligar': 'Ligar',
    'universidad': 'Universidad',
    'planes': 'Planes',
    'cerca': 'Cerca de mí',
    'amistad': 'Amistad',
    'arte': 'Arte',
    'ciudad': 'Ciudad'
  };

  const topicName = topicNameMap[topicId] || topicId;

  // If no existing chat, create a new one
  const { data: newChat, error: createError } = await supabase
    .from('group_chats')
    .insert({
      category: topicId,
      city,
      type: 'topic',
      name: `${topicName} - ${city}`
    })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  return newChat.id;
} 