# HallWorld Project

A React-based social platform with authentication, location selection, and profile customization features.

## Project Structure

### Core Files
- `src/main.tsx` - Application entry point with React Router setup
- `src/App.tsx` - Main application component with location management and authentication flow
- `src/routes.tsx` - Router configuration with main and profile routes
- `src/index.css` - Global styles and glass-effect utilities

### Components

#### Authentication & User Interface
- `src/components/AuthScreen.tsx` - Login and registration interface with glass morphism design
- `src/components/Header.tsx` - Navigation header with notifications and user profile
- `src/components/ProfileEditor.tsx` - Canvas-based profile customization tool

#### Location Selection
- `src/components/CountrySelector.tsx` - Country selection dropdown
- `src/components/CitySelector.tsx` - City selection dropdown with search functionality

#### Navigation & Menu
- `src/components/CircularMenu.tsx` - Bottom circular menu with category icons
- `src/components/HallButtons.tsx` - Main navigation buttons

### Pages
- `src/pages/ProfilePage.tsx` - User profile page with canvas editor

### Libraries & Utilities
- `src/lib/supabase.ts` - Supabase client configuration
- `src/lib/location.ts` - Location data management
- `src/lib/store.ts` - Global state management with Zustand

## Features

### Authentication
- Email/password authentication
- User session management
- Registration and login flows

### Location Management
- Country and city selection
- Search functionality for cities
- Location state persistence

### Profile Customization
- Canvas-based profile editor
- Shape and text tools
- Image upload capability
- Color customization
- Layer management

### UI/UX
- Glass morphism design system
- Responsive layouts
- Animated transitions
- Interactive notifications
- Mobile-friendly interface

## Technical Stack

- React
- TypeScript
- Framer Motion
- Supabase
- Fabric.js
- TailwindCSS
- Tanstack Router

## Environment Setup

Required environment variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Set up environment variables
4. Start development server:
```bash
npm run dev
```

## Component Documentation

### AuthScreen
Authentication component with login and registration capabilities. Features a modern glass-morphism design with animated transitions.

### ProfileEditor
Canvas-based editor for profile customization with the following features:
- Text addition and editing
- Shape manipulation
- Image upload
- Color picker
- Layer management
- State persistence

### CircularMenu
Bottom navigation menu with animated icons for different categories:
- Politics
- Dating
- University
- Plans
- Nearby
- Friendship
- Art
- City

### Header
Navigation header with:
- Notification system
- User profile access
- Session management
- Animated glass effects

## TODO

### Chat System Implementation
- Create individual chat screen (`src/pages/ChatPage.tsx`)
  - Real-time messaging with Supabase
  - Message history
  - User presence indicators
  - Typing indicators
  - Media sharing capabilities

- Implement global chat room (`src/pages/GlobalChatPage.tsx`)
  - Public message broadcasting
  - User list management
  - Moderation tools
  - Channel system

### Real-time Features
- Set up Supabase real-time subscriptions
- Implement message queuing
- Add offline message support
- Create message delivery status indicators

### Translation System
- Integrate client-side LLM for real-time translation
- Implement language detection
- Add language preference settings
- Create translation toggle UI
- Cache translated messages
- Optimize translation performance

### Database Schema Updates
```sql
-- Messages Table
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references auth.users(id),
  receiver_id uuid references auth.users(id),
  content text not null,
  original_language text,
  translations jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Chat Rooms Table
create table public.chat_rooms (
  id uuid default uuid_generate_v4() primary key,
  name text,
  type text check (type in ('individual', 'global')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Room Participants Table
create table public.room_participants (
  room_id uuid references public.chat_rooms(id),
  user_id uuid references auth.users(id),
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (room_id, user_id)
);
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request