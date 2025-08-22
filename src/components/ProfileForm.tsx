import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Save, Upload, X, Palette, Type, Highlighter } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
// Import the custom Quill preview styles
import '../styles/quill-preview.css';  // Add this import

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
  bio_background_color: string;
  bio_background_image: string | null;
  bio_background_type: 'color' | 'image';
  // New fields for container background
  container_background_color: string;
  container_background_image: string | null;
  container_background_type: 'color' | 'image';
}

// Helper component for dynamic styling
interface EditorBackgroundStylesProps {
  color: string;
  image: string | null;
  type: 'color' | 'image';
}

const EditorBackgroundStyles = ({ color, image, type }: EditorBackgroundStylesProps) => {
  const background = type === 'image' && image 
    ? `url(${image}) center/cover no-repeat` 
    : color;
  
  const css = `
    .rich-text-editor-container .ql-container {
      background: ${background};
      max-height: 150px; /* This height accommodates approximately 5 lines */
      overflow-y: auto; /* Add scrollbar when content exceeds height */
    }

    /* Optional: To make the toolbar stick to the top */
    .rich-text-editor-container .ql-toolbar {
      position: sticky;
      top: 0;
      z-index: 1;
      background: rgba(8, 47, 73, 0.8);
      border-bottom: 1px solid rgba(6, 182, 212, 0.2);
    }

    /* Styling for the preview mode */
    .rich-text-preview {
      background: ${background};
      padding: 1rem;
      border-radius: 0.5rem;
      max-height: 300px;
      overflow-y: auto;
    }

    /* Apply Quill styles to preview */
    .rich-text-preview .ql-size-small {
      font-size: 0.75em;
    }
    
    .rich-text-preview .ql-size-large {
      font-size: 1.5em;
    }
    
    .rich-text-preview .ql-size-huge {
      font-size: 2.5em;
    }
    
    .rich-text-preview p {
      margin-bottom: 0.5em;
    }
    
    .rich-text-preview h1, 
    .rich-text-preview h2, 
    .rich-text-preview h3 {
      margin-top: 1em;
      margin-bottom: 0.5em;
    }
    
    .rich-text-preview ul, 
    .rich-text-preview ol {
      padding-left: 2em;
      margin-bottom: 0.5em;
    }
    
    .rich-text-preview a {
      text-decoration: underline;
    }
    
    .rich-text-preview blockquote {
      border-left: 4px solid #ccc;
      padding-left: 16px;
      margin-bottom: 0.5em;
    }
    
    .rich-text-preview .ql-align-center {
      text-align: center;
    }
    
    .rich-text-preview .ql-align-right {
      text-align: right;
    }
    
    .rich-text-preview .ql-align-justify {
      text-align: justify;
    }
  `;
  
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

// Add this after the EditorBackgroundStyles component
interface ContainerBackgroundStylesProps {
  color: string;
  image: string | null;
  type: 'color' | 'image';
}

const ContainerBackgroundStyles = ({ color, image, type }: ContainerBackgroundStylesProps) => {
  const background = type === 'image' && image 
    ? `url(${image}) center/cover no-repeat` 
    : color;
  
  const css = `
    .profile-container {
      background: ${background};
    }
  `;
  
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

// Preview component
const ProfilePreview = ({ profile, avatarPreview }: { profile: Profile; avatarPreview: string | null }) => {
  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex justify-center">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-cyan-400/30 to-blue-500/30 border-4 border-cyan-500/30 shadow-lg">
          {avatarPreview || profile.avatar_url ? (
            <img
              src={avatarPreview || profile.avatar_url || ''}
              alt="Perfil"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-cyan-800/20 text-cyan-300">
              <span className="text-4xl font-light">+</span>
            </div>
          )}
        </div>
      </div>

      {/* Likings */}
      {profile.likings && (
        <div className="text-center text-cyan-300 px-4 py-2 bg-cyan-900/30 rounded-lg">
          {profile.likings}
        </div>
      )}

      {/* Biography with rich text */}
      <div className="rich-text-preview">




        {/* This is crucial - include the ql-editor class and other Quill styles */}
        <div 
          className="ql-container ql-snow" 
          style={{ border: 'none' }}
        >
          <div 
            className="ql-editor" 
            dangerouslySetInnerHTML={{ __html: profile.biography }}
          />
        </div>
      </div>
    </div>
  );
};

export function ProfileForm({ userId }: ProfileFormProps) {
  // All useState hooks need to be at the top of the component
  const [profile, setProfile] = useState<Profile>({
    name: '',
    likings: '',
    age: null,
    gender: '',
    avatar_url: null,
    biography: '',
    bio_background_color: 'rgba(8, 47, 73, 0.3)', // Default color
    bio_background_image: null,
    bio_background_type: 'color',
    // Default values for container background
    container_background_color: 'rgba(8, 47, 73, 0.2)', // Slightly different default
    container_background_image: null,
    container_background_type: 'color'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  // Add the new state hooks here, along with all other useState calls
  const [textColor, setTextColor] = useState('#ffffff'); 
  const [textBackgroundColor, setTextBackgroundColor] = useState('transparent');
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [bgImagePreview, setBgImagePreview] = useState<string | null>(null);
  const [containerBgImageFile, setContainerBgImageFile] = useState<File | null>(null);
  const [containerBgImagePreview, setContainerBgImagePreview] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
    // Add a ref to access the Quill editor instance
  const quillRef = useRef<ReactQuill>(null);
  // All useRef hooks need to be together after the useState hooks
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const containerBgImageInputRef = useRef<HTMLInputElement>(null);
  // const quillRef = useRef<ReactQuill>(null);

  // All useEffect hooks follow
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Profile data fetch effect
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
          biography: '',
          bio_background_color: 'rgba(8, 47, 73, 0.3)', // Default color
          bio_background_image: null,
          bio_background_type: 'color',
          container_background_color: 'rgba(8, 47, 73, 0.2)', // Default container background
          container_background_image: null,
          container_background_type: 'color'
        };
        
        // Try to fetch each field individually to handle missing columns
        const fields = [
          'name', 'likings', 'age', 'gender', 'avatar_url', 'biography', 
          'bio_background_color', 'bio_background_image', 'bio_background_type',
          'container_background_color', 'container_background_image', 'container_background_type'
        ];
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

  // All useMemo hooks follow
  const quillModules = useMemo(() => {
    return {
      toolbar: [
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link'],
        ['clean']
      ],
    };
  }, []);

  const quillFormats = [
    'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'align',
    'list', 'bullet',
    'link'
  ];

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setProfile(prev => ({
      ...prev,
      [name]: name === 'age' ? (value ? parseInt(value) : null) : value
    }));
  };

  // Add this state to track line count
  const [lineCount, setLineCount] = useState(0);

  // Handle rich text biography changes
  const handleBiographyChange = (content: string) => {
    setProfile(prev => ({
      ...prev,
      biography: content
    }));

    // Count lines (approximation by counting <p> tags and <br> tags)
    const lineBreaks = (content.match(/<p>/g) || []).length;
    const brTags = (content.match(/<br>/g) || []).length;
    const estimatedLines = lineBreaks + brTags + 1;
    setLineCount(estimatedLines);
  };

  // Handle color change
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setProfile(prev => ({
      ...prev,
      bio_background_color: value
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

  // Handle background image file selection
  const handleBgImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    setBgImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBgImagePreview(event.target.result as string);
        // Update profile to use image background
        setProfile(prev => ({
          ...prev,
          bio_background_type: 'image',
          bio_background_image: event.target.result as string // Temporary preview
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Clear background image
  const clearBgImage = () => {
    setBgImageFile(null);
    setBgImagePreview(profile.bio_background_image);
    setProfile(prev => ({
      ...prev,
      bio_background_type: 'color'
    }));
    if (bgImageInputRef.current) {
      bgImageInputRef.current.value = '';
    }
  };

  // Upload background image to storage
  const uploadBackgroundImage = async (): Promise<string | null> => {
    if (!bgImageFile) return profile.bio_background_image;

    try {
      // Create a unique file path
      const fileExt = bgImageFile.name.split('.').pop();
      // Make sure userId is the first folder in the path to match the storage policy
      const filePath = `${userId}/bg_${Date.now()}.${fileExt}`;

      console.log('Uploading background image to path:', filePath);

      // Upload the file to the 'backgrounds' bucket
      const { error: uploadError } = await supabase.storage
        .from('backgrounds')
        .upload(filePath, bgImageFile, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        if (uploadError.message && uploadError.message.includes('Bucket not found')) {
          // Fallback to base64 if bucket doesn't exist
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(bgImageFile);
          });
        }
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(filePath);

      console.log('Upload successful, URL:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading background image:', error);
      setMessage({
        text: 'Error al subir la imagen de fondo. Por favor, contacta con soporte.',
        type: 'error'
      });
      return profile.bio_background_image;
    }
  };

  // Handle container background image file selection
  const handleContainerBgImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    setContainerBgImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setContainerBgImagePreview(event.target.result as string);
        // Update profile to use image background
        setProfile(prev => ({
          ...prev,
          container_background_type: 'image',
          container_background_image: event.target.result as string // Temporary preview
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Clear container background image
  const clearContainerBgImage = () => {
    setContainerBgImageFile(null);
    setContainerBgImagePreview(profile.container_background_image);
    setProfile(prev => ({
      ...prev,
      container_background_type: 'color'
    }));
    if (containerBgImageInputRef.current) {
      containerBgImageInputRef.current.value = '';
    }
  };

  // Handle container background color change
  const handleContainerColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setProfile(prev => ({
      ...prev,
      container_background_color: value
    }));
  };

  // Upload container background image to storage
  const uploadContainerBackgroundImage = async (): Promise<string | null> => {
    if (!containerBgImageFile) return profile.container_background_image;

    try {
      // Create a unique file path
      const fileExt = containerBgImageFile.name.split('.').pop();
      // Make sure userId is the first folder in the path to match the storage policy
      const filePath = `${userId}/container_bg_${Date.now()}.${fileExt}`;

      console.log('Uploading container background image to path:', filePath);

      // Upload the file to the 'backgrounds' bucket
      const { error: uploadError } = await supabase.storage
        .from('backgrounds')
        .upload(filePath, containerBgImageFile, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        if (uploadError.message && uploadError.message.includes('Bucket not found')) {
          // Fallback to base64 if bucket doesn't exist
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(containerBgImageFile);
          });
        }
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(filePath);

      console.log('Upload successful, URL:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading container background image:', error);
      setMessage({
        text: 'Error al subir la imagen de fondo. Por favor, contacta con soporte.',
        type: 'error'
      });
      return profile.container_background_image;
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

      // Upload background image if changed
      let bioBackgroundImage = profile.bio_background_image;
      if (bgImageFile && profile.bio_background_type === 'image') {
        bioBackgroundImage = await uploadBackgroundImage();
      }

      // Upload container background image if changed
      let containerBackgroundImage = profile.container_background_image;
      if (containerBgImageFile && profile.container_background_type === 'image') {
        containerBackgroundImage = await uploadContainerBackgroundImage();
      }

      // Create an update object with all fields we want to update
      const updateData: any = {
        avatar_url: avatarUrl,
        bio_background_color: profile.bio_background_color,
        bio_background_image: bioBackgroundImage,
        bio_background_type: profile.bio_background_type,
        container_background_color: profile.container_background_color,
        container_background_image: containerBackgroundImage,
        container_background_type: profile.container_background_type,
        biography: profile.biography,
        likings: profile.likings,
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        updated_at: new Date()
      };

      // Update all fields at once
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error("Error updating profile:", error);
        setMessage({
          text: 'Error al actualizar el perfil. Por favor, inténtalo de nuevo.',
          type: 'error'
        });
        return;
      }

      // Update local state
      setProfile(prev => ({
        ...prev,
        avatar_url: avatarUrl,
        bio_background_image: bioBackgroundImage,
        container_background_image: containerBackgroundImage
      }));

      // Clear file state
      setAvatarFile(null);
      setBgImageFile(null);
      setContainerBgImageFile(null);

      setMessage({ text: 'Perfil actualizado con éxito!', type: 'success' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ text: 'Error al actualizar el perfil. Por favor, inténtalo de nuevo.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const togglePreview = () => {
    setPreviewMode(!previewMode);
  };

  if (loading) {
    return (
      <div className="glossy p-8 rounded-2xl flex justify-center items-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
      </div>
    );
  }

  // Color presets for quick selection
  const colorPresets = [
    'rgba(8, 47, 73, 0.3)', // Default cyan
    '#1e3a8a',  // Dark blue
    '#831843',  // Dark pink
    '#3f6212',  // Dark green
    '#1e40af',  // Medium blue
    '#7e22ce',  // Purple
  ];
  
  // Function to apply text color to selected text
  const applyTextColor = (color: string) => {
    setTextColor(color);
    
    // Get the Quill editor instance
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    
    // Apply color to selected text, or set format for future typing
    const selection = quill.getSelection();
    if (selection) {
      // If text is selected, apply color to selection
      if (selection.length > 0) {
        quill.format('color', color);
      } else {
        // If no text is selected, just set the format for future typing
        quill.format('color', color);
      }
    } else {
      // If no selection, set the cursor position and set format
      quill.focus();
      quill.format('color', color);
    }
  };
  
  // Function to apply text background color
  const applyTextBackgroundColor = (color: string) => {
    setTextBackgroundColor(color);
    
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    
    const selection = quill.getSelection();
    if (selection) {
      if (selection.length > 0) {
        quill.format('background', color);
      } else {
        quill.format('background', color);
      }
    } else {
      quill.focus();
      quill.format('background', color);
    }
  };
  
  // Define color presets
  const textColorPresets = [
    '#ffffff', // White
    '#67E8F9', // Cyan
    '#f87171', // Red
    '#fbbf24', // Yellow
    '#34d399', // Green
    '#818cf8'  // Indigo
  ];
  
  const textBackgroundColorPresets = [
    'transparent', // Transparent
    '#134e4a',    // Dark teal
    '#3b0764',    // Dark purple
    '#422006',    // Dark amber
    '#881337',    // Dark rose
    '#082f49'     // Dark blue
  ];

  return (
    <div 
      className={`profile-container relative overflow-hidden rounded-[32px] ${
        profile.container_background_type === 'image' && profile.container_background_image
          ? '' // No background color class when using image
          : 'bg-cyan-900/20' // Apply background color class only when not using image
      } backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)] p-6 md:p-8`}
      style={{
        background: profile.container_background_type === 'image' && profile.container_background_image 
          ? `url(${profile.container_background_image}) center/cover no-repeat` 
          : profile.container_background_color
      }}
    >
      {/* Prismatic edge effect */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />

      {/* Dynamic styling for editor background */}
      <EditorBackgroundStyles 
        color={profile.bio_background_color} 
        image={profile.bio_background_image}
        type={profile.bio_background_type}
      />

      {/* Dynamic styling for container background */}
      <ContainerBackgroundStyles 
        color={profile.container_background_color} 
        image={profile.container_background_image}
        type={profile.container_background_type}
      />

      {previewMode ? (
        <div className="space-y-8">
          <ProfilePreview 
            profile={profile} 
            avatarPreview={avatarPreview} 
          />
          
          {/* Toggle button at the bottom */}
          <motion.button
            type="button"
            onClick={togglePreview}
            className="w-full px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white font-medium hover:opacity-95 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:translate-y-[-2px]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Volver a Editar</span>
          </motion.button>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-cyan-300 mb-6 flex items-center justify-between">
            {loading && (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-t-transparent border-cyan-400 rounded-full animate-spin"></div>
                <span className="text-sm font-normal text-cyan-400">Cargando...</span>
              </div>
            )}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-cyan-400/30 to-blue-500/30 mb-3 border-4 border-cyan-500/30 shadow-lg transition-transform duration-300 group-hover:scale-105">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-cyan-800/20 text-cyan-300">
                      <span className="text-4xl font-light">+</span>
                    </div>
                  )}
                </div>

                {avatarFile && (
                  <button
                    type="button"
                    onClick={clearAvatar}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 px-4 shadow-[0_2px_5px_rgba(31,38,135,0.1)] flex items-center gap-2"
              >
                <Upload size={16} className="text-cyan-300" />
                <span className="text-cyan-300 font-medium">Subir Foto</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Biography with Rich Text Editor and background color picker */}
              <div className="col-span-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">              
                  {/* Color pickers for text, text background, and editor background */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Text color picker */}
                    <div className="flex items-center space-x-2">
                      <label htmlFor="text_color" className="text-cyan-300 text-xs font-medium">
                        Texto:
                      </label>
                      <div className="relative">
                        <div 
                          className="w-6 h-6 rounded border border-cyan-500/40 cursor-pointer overflow-hidden flex items-center justify-center"
                          style={{ backgroundColor: textColor }}
                          onClick={() => document.getElementById('text_color')?.click()}
                        >
                          <Type size={14} className="text-black/70" />
                        </div>
                        <input
                          type="color"
                          id="text_color"
                          value={textColor}
                          onChange={(e) => applyTextColor(e.target.value)}
                          className="absolute opacity-0 w-0 h-0"
                        />
                      </div>
                      
                      {/* Text color presets */}
                      <div className="flex space-x-1">
                        {textColorPresets.map(color => (
                          <button
                            key={color}
                            type="button"
                            className={`w-4 h-4 rounded-full ${textColor === color ? 'ring-2 ring-white' : 'ring-1 ring-cyan-500/20'}`}
                            style={{ backgroundColor: color }}
                            onClick={() => applyTextColor(color)}
                            title="Cambiar color de texto"
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Text background color picker */}
                    <div className="flex items-center space-x-2">
                      <label htmlFor="text_background_color" className="text-cyan-300 text-xs font-medium">
                        Resaltado:
                      </label>
                      <div className="relative">
                        <div 
                          className="w-6 h-6 rounded border border-cyan-500/40 cursor-pointer overflow-hidden flex items-center justify-center"
                          style={{ backgroundColor: textBackgroundColor === 'transparent' ? '#082f49' : textBackgroundColor }}
                        >
                          <Highlighter size={14} className="text-white/70" onClick={() => document.getElementById('text_background_color')?.click()} />
                        </div>
                        <input
                          type="color"
                          id="text_background_color"
                          value={textBackgroundColor !== 'transparent' ? textBackgroundColor : '#082f49'}
                          onChange={(e) => applyTextBackgroundColor(e.target.value)}
                          className="absolute opacity-0 w-0 h-0"
                        />
                      </div>
                      
                      {/* Text background color presets */}
                      <div className="flex space-x-1">
                        {textBackgroundColorPresets.map(color => (
                          <button
                            key={color}
                            type="button"
                            className={`w-4 h-4 rounded-full ${textBackgroundColor === color ? 'ring-2 ring-white' : 'ring-1 ring-cyan-500/20'} ${color === 'transparent' ? 'bg-opacity-20 bg-white' : ''}`}
                            style={{ backgroundColor: color === 'transparent' ? '#082f49' : color }}
                            onClick={() => applyTextBackgroundColor(color)}
                            title={color === 'transparent' ? "Sin resaltado" : "Cambiar color de resaltado"}
                          >
                            {color === 'transparent' && (
                              <X size={10} className="text-white/70 m-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Background type toggle */}
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-cyan-300 text-xs font-medium">Fondo:</span>
                      <div className="flex bg-cyan-900/30 rounded-lg p-1">
                        <button
                          type="button"
                          className={`px-3 py-1 rounded ${profile.bio_background_type === 'color' 
                            ? 'bg-cyan-600 text-white' 
                            : 'text-cyan-300 hover:bg-cyan-800/30'}`}
                          onClick={() => setProfile(prev => ({ ...prev, bio_background_type: 'color' }))}
                        >
                          Color
                        </button>
                        <button
                          type="button"
                          className={`px-3 py-1 rounded ${profile.bio_background_type === 'image' 
                            ? 'bg-cyan-600 text-white' 
                            : 'text-cyan-300 hover:bg-cyan-800/30'}`}
                          onClick={() => setProfile(prev => ({ ...prev, bio_background_type: 'image' }))}
                        >
                          Imagen
                        </button>
                      </div>
                    </div>

                    {/* Show appropriate background selector based on type */}
                    {profile.bio_background_type === 'color' ? (
                      <div className="flex items-center space-x-2">
                        {/* Your existing color picker code */}
                        <label htmlFor="bio_background_color" className="text-cyan-300 text-xs font-medium">
                          Color de fondo:
                        </label>
                        <div className="relative">
                          <div 
                            className="w-6 h-6 rounded border border-cyan-500/40 cursor-pointer overflow-hidden flex items-center justify-center"
                            style={{ backgroundColor: profile.bio_background_color }}
                            onClick={() => document.getElementById('bio_background_color')?.click()}
                          >
                            <Palette size={14} className="text-white/70" />
                          </div>
                          <input
                            type="color"
                            id="bio_background_color"
                            name="bio_background_color"
                            value={profile.bio_background_color}
                            onChange={handleColorChange}
                            className="absolute opacity-0 w-0 h-0"
                          />
                        </div>
                        
                        {/* Color presets */}
                        <div className="flex space-x-1">
                          {colorPresets.map(color => (
                            <button
                              key={color}
                              type="button"
                              className={`w-4 h-4 rounded-full ${profile.bio_background_color === color ? 'ring-2 ring-white' : 'ring-1 ring-cyan-500/20'}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setProfile(prev => ({ ...prev, bio_background_color: color }))}
                              title="Cambiar color de fondo"
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => bgImageInputRef.current?.click()}
                          className="relative overflow-hidden rounded-lg bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 px-4 shadow-[0_2px_5px_rgba(31,38,135,0.1)] flex items-center gap-2"
                        >
                          <Upload size={16} className="text-cyan-300" />
                          <span className="text-cyan-300 font-medium">Subir Imagen de Fondo</span>
                        </button>
                        
                        {bgImagePreview && (
                          <button
                            type="button"
                            onClick={clearBgImage}
                            className="bg-red-500/80 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        )}
                        
                        <input
                          ref={bgImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleBgImageChange}
                          className="hidden"
                        />
                        
                        {bgImagePreview && (
                          <div className="w-8 h-8 rounded border border-cyan-500/40 overflow-hidden">
                            <img src={bgImagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="rich-text-editor-container">
                  <div className="text-xs text-cyan-400 mb-1">
                    La biografía está limitada a 5 líneas de altura. El contenido adicional requerirá desplazamiento.
                  </div>
                  
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={profile.biography}
                    onChange={handleBiographyChange}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Cuéntanos sobre ti..."
                    className="bg-cyan-900/30 text-cyan-100 rounded-lg border border-cyan-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Container Background Settings */}
            <div className="mb-6 p-4 rounded-lg bg-cyan-900/20 border border-cyan-500/30">
              <h3 className="text-cyan-300 font-medium mb-3">Personalizar Fondo del Perfil</h3>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Background type toggle */}
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-cyan-300 text-xs font-medium">Tipo:</span>
                  <div className="flex bg-cyan-900/30 rounded-lg p-1">
                    <button
                      type="button"
                      className={`px-3 py-1 rounded ${profile.container_background_type === 'color' 
                        ? 'bg-cyan-600 text-white' 
                        : 'text-cyan-300 hover:bg-cyan-800/30'}`}
                      onClick={() => setProfile(prev => ({ ...prev, container_background_type: 'color' }))}
                    >
                      Color
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 rounded ${profile.container_background_type === 'image' 
                        ? 'bg-cyan-600 text-white' 
                        : 'text-cyan-300 hover:bg-cyan-800/30'}`}
                      onClick={() => setProfile(prev => ({ ...prev, container_background_type: 'image' }))}
                    >
                      Imagen
                    </button>
                  </div>
                </div>

                {/* Show appropriate background selector based on type */}
                {profile.container_background_type === 'color' ? (
                  <div className="flex items-center space-x-2">
                    <label htmlFor="container_background_color" className="text-cyan-300 text-xs font-medium">
                      Color:
                    </label>
                    <div className="relative">
                      <div 
                        className="w-6 h-6 rounded border border-cyan-500/40 cursor-pointer overflow-hidden flex items-center justify-center"
                        style={{ backgroundColor: profile.container_background_color }}
                        onClick={() => document.getElementById('container_background_color')?.click()}
                      >
                        <Palette size={14} className="text-white/70" />
                      </div>
                      <input
                        type="color"
                        id="container_background_color"
                        name="container_background_color"
                        value={profile.container_background_color}
                        onChange={handleContainerColorChange}
                        className="absolute opacity-0 w-0 h-0"
                      />
                    </div>
                    
                    {/* Color presets */}
                    <div className="flex space-x-1">
                      {colorPresets.map(color => (
                        <button
                          key={color}
                          type="button"
                          className={`w-4 h-4 rounded-full ${profile.container_background_color === color ? 'ring-2 ring-white' : 'ring-1 ring-cyan-500/20'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setProfile(prev => ({ ...prev, container_background_color: color }))}
                          title="Cambiar color de fondo"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => containerBgImageInputRef.current?.click()}
                      className="relative overflow-hidden rounded-lg bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 px-4 shadow-[0_2px_5px_rgba(31,38,135,0.1)] flex items-center gap-2"
                    >
                      <Upload size={16} className="text-cyan-300" />
                      <span className="text-cyan-300 font-medium">Subir Imagen de Fondo</span>
                    </button>
                    
                    {containerBgImagePreview && (
                      <button
                        type="button"
                        onClick={clearContainerBgImage}
                        className="bg-red-500/80 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                    
                    <input
                      ref={containerBgImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleContainerBgImageChange}
                      className="hidden"
                    />
                    
                    {containerBgImagePreview && (
                      <div className="w-8 h-8 rounded border border-cyan-500/40 overflow-hidden">
                        <img src={containerBgImagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Status Message */}
            {message && (
              <div className={`p-4 rounded-lg ${message.type === 'success'
                  ? 'bg-green-500/20 text-cyan-300 border-l-4 border-green-400'
                  : message.type === 'warning'
                    ? 'bg-yellow-500/20 text-cyan-300 border-l-4 border-yellow-400'
                    : 'bg-red-500/20 text-cyan-300 border-l-4 border-red-400'
                }`}>
                {message.text}
              </div>
            )}

            {/* Preview and Submit Buttons */}
            <div className="flex gap-4">
              <motion.button
                type="button"
                onClick={togglePreview}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white font-medium hover:opacity-95 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:translate-y-[-2px]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>Previsualizar</span>
              </motion.button>

              <motion.button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-medium hover:opacity-95 transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:translate-y-[-2px] disabled:hover:translate-y-0 disabled:hover:shadow-lg"
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
                    <span>Guardar Cambios</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
