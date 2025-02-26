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