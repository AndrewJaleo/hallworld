import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Save, Upload, X } from 'lucide-react';

interface ProfileFormProps {
  userId: string;
}

interface Profile {
  name: string;
  likings: string;
  age: number | null;
  gender: string;
  avatar_url: string | null;
  biography: string;
}

export function ProfileForm({ userId }: ProfileFormProps) {
  const [profile, setProfile] = useState<Profile>({
    name: '',
    likings: '',
    age: null,
    gender: '',
    avatar_url: null,
    biography: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile data
  useEffect(() => {
    async function getProfile() {
      try {
        setLoading(true);
        
        // Initialize with default values
        const defaultProfile = {
          name: '',
          likings: '',
          age: null,
          gender: '',
          avatar_url: null,
          biography: ''
        };
        
        // Try to fetch each field individually to handle missing columns
        const fields = ['name', 'likings', 'age', 'gender', 'avatar_url', 'biography'];
        const profileData = { ...defaultProfile };
        
        for (const field of fields) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select(`${field}`)
              .eq('id', userId)
              .single();
            
            if (!error && data && data[field as keyof typeof data] !== null) {
              // Set the field in profileData
              (profileData as any)[field] = data[field as keyof typeof data];
              
              // Set avatar preview if we have an avatar_url
              if (field === 'avatar_url' && typeof data[field as keyof typeof data] === 'string') {
                setAvatarPreview(data[field as keyof typeof data] as string);
              }
            }
          } catch (fieldError) {
            console.warn(`Could not fetch field ${field}:`, fieldError);
          }
        }
        
        // Set the profile with all the data we could fetch
        setProfile(profileData);
        
        // Log the profile data for debugging
        console.log('Loaded profile data:', profileData);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }
    
    getProfile();
  }, [userId]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setProfile(prev => ({
      ...prev,
      [name]: name === 'age' ? (value ? parseInt(value) : null) : value
    }));
  };

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarPreview(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Clear avatar
  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(profile.avatar_url);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload avatar to storage
  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return profile.avatar_url;
    
    try {
      // Create a unique file path
      const fileExt = avatarFile.name.split('.').pop();
      // Make sure userId is the first folder in the path to match the storage policy
      const filePath = `${userId}/${Date.now()}.${fileExt}`;
      
      // Try to upload to the default 'avatars' bucket
      // If that fails, try to create the bucket first
      try {
        console.log('Uploading to path:', filePath);
        
        // Upload the file to the 'avatars' bucket
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          if (uploadError.message && uploadError.message.includes('Bucket not found')) {
            console.warn('Bucket not found, attempting to create it...');
            throw uploadError;
          }
          throw uploadError;
        }
        
        // Get the public URL
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        console.log('Upload successful, URL:', data.publicUrl);
        return data.publicUrl;
      } catch (bucketError: any) {
        // If the bucket doesn't exist, try to create it
        if (bucketError.message && bucketError.message.includes('Bucket not found')) {
          // For security reasons, we can't create buckets from the client
          // Instead, we'll use a fallback approach - store the image as base64 in the avatar_url field
          console.warn('Bucket not found. Using base64 fallback...');
          
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              // The result is a base64 string representation of the image
              resolve(reader.result as string);
            };
            reader.readAsDataURL(avatarFile);
          });
        }
        
        throw bucketError;
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setMessage({ 
        text: 'Error al subir la imagen. Por favor, contacta con soporte.', 
        type: 'error' 
      });
      return profile.avatar_url;
    }
  };

  // Save profile
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setMessage(null);
      
      // Upload avatar if changed
      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }
      
      // Create an update object with only the avatar_url first
      // This is guaranteed to work since avatar_url is in the original schema
      const updateData: any = {
        avatar_url: avatarUrl,
        updated_at: new Date()
      };
      
      // Try to update just the avatar first
      const { error: avatarError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);
      
      if (avatarError) {
        throw avatarError;
      }
      
      // Now try to update each field individually to identify which ones exist
      const fields = [
        { key: 'name', value: profile.name },
        { key: 'likings', value: profile.likings },
        { key: 'age', value: profile.age },
        { key: 'gender', value: profile.gender },
        { key: 'biography', value: profile.biography }
      ];
      
      let successCount = 1; // Start with 1 for avatar_url
      let totalFields = fields.length + 1; // +1 for avatar_url
      
      for (const field of fields) {
        try {
          const fieldUpdate = { [field.key]: field.value };
          const { error } = await supabase
            .from('profiles')
            .update(fieldUpdate)
            .eq('id', userId);
          
          if (!error) {
            successCount++;
          } else {
            console.warn(`Could not update field ${field.key}:`, error);
          }
        } catch (fieldError) {
          console.warn(`Error updating field ${field.key}:`, fieldError);
        }
      }
      
      // Update local state with the new avatar URL
      if (avatarUrl !== profile.avatar_url) {
        setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
        setAvatarFile(null);
      }
      
      // Set appropriate message based on how many fields were updated
      if (successCount === totalFields) {
        setMessage({ text: 'Perfil actualizado con éxito!', type: 'success' });
      } else if (successCount > 1) {
        setMessage({ 
          text: `Perfil actualizado parcialmente (${successCount} de ${totalFields} campos). Algunos campos no pudieron guardarse debido a un problema en la base de datos. Por favor, contacta con soporte.`, 
          type: 'warning' 
        });
      } else {
        setMessage({ 
          text: 'Solo se actualizó la imagen de perfil. Otros campos no pudieron guardarse debido a un problema en la base de datos. Por favor, contacta con soporte.', 
          type: 'warning' 
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ text: 'Error al actualizar el perfil. Por favor, inténtalo de nuevo.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glossy p-6 rounded-2xl flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="glossy p-6 rounded-2xl">
      <h2 className="text-sky-900 text-xl font-semibold mb-6">Editar Perfil</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 mb-2">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Perfil" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                  Sin Imagen
                </div>
              )}
            </div>
            
            {avatarFile && (
              <button
                type="button"
                onClick={clearAvatar}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="glass-button px-3 py-1.5 text-sm flex items-center gap-1.5"
          >
            <Upload size={14} />
            <span className="text-violet-600 font-medium">Subir Foto</span>
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sky-900 text-sm font-medium mb-1">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={profile.name}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-white/70 border border-sky-200 text-sky-900 placeholder-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-300"
            placeholder="Tu nombre"
          />
        </div>
        
        {/* Age */}
        <div>
          <label htmlFor="age" className="block text-sky-900 text-sm font-medium mb-1">
            Edad
          </label>
          <input
            id="age"
            name="age"
            type="number"
            min="1"
            max="120"
            value={profile.age || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-white/70 border border-sky-200 text-sky-900 placeholder-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-300"
            placeholder="Tu edad"
          />
        </div>
        
        {/* Gender */}
        <div>
          <label htmlFor="gender" className="block text-sky-900 text-sm font-medium mb-1">
            Género
          </label>
          <select
            id="gender"
            name="gender"
            value={profile.gender}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-white/70 border border-sky-200 text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            <option value="">Seleccionar género</option>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
            <option value="non-binary">No binario</option>
            <option value="other">Otro</option>
            <option value="prefer-not-to-say">Prefiero no decirlo</option>
          </select>
        </div>
        
        {/* Likings */}
        <div>
          <label htmlFor="likings" className="block text-sky-900 text-sm font-medium mb-1">
            Gustos
          </label>
          <input
            id="likings"
            name="likings"
            type="text"
            value={profile.likings}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-white/70 border border-sky-200 text-sky-900 placeholder-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-300"
            placeholder="¿Qué te gusta? (ej. música, deportes, libros)"
          />
        </div>
        
        {/* Biography */}
        <div>
          <label htmlFor="biography" className="block text-sky-900 text-sm font-medium mb-1">
            Biografía
          </label>
          <textarea
            id="biography"
            name="biography"
            rows={4}
            value={profile.biography}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-white/70 border border-sky-200 text-sky-900 placeholder-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
            placeholder="Cuéntanos sobre ti..."
          />
        </div>
        
        {/* Status Message */}
        {message && (
          <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : message.type === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
            {message.type === 'success' && 'Perfil actualizado con éxito!'}
            {message.type === 'warning' && 'Perfil actualizado parcialmente. Algunos campos no pudieron guardarse debido a un problema en la base de datos. Por favor, contacta con soporte.'}
            {message.type === 'error' && 'Error al actualizar el perfil. Por favor, inténtalo de nuevo.'}
          </div>
        )}
        
        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={saving}
          className="w-full px-6 py-3 bg-gradient-to-r from-violet-500 to-violet-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Guardar Perfil</span>
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
} 