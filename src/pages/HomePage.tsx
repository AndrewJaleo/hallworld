import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPinOff } from 'lucide-react';
import { Header } from '../components/Header';
import { CountrySelector } from '../components/CountrySelector';
import { CitySelector } from '../components/CitySelector';
import { CircularMenu } from '../components/CircularMenu';
import { HallButtons } from '../components/HallButtons';
import { PrivateChatsList } from '../components/PrivateChatsList';
import { UsersList } from '../components/UsersList';
import { getCountries, getCitiesByCountry, Country } from '../lib/location';
import { supabase } from '../lib/supabase';

interface LocationState {
  countries: Country[];
  cities: string[];
  selectedCountry: string;
  selectedCity: string;
}

export function HomePage() {
  const [state, setState] = useState<LocationState>({
    countries: getCountries(),
    cities: getCountries()[0].cities,
    selectedCountry: getCountries()[0].name,
    selectedCity: getCountries()[0].cities[0]
  });
  const [userEmail, setUserEmail] = useState<string>("");
  const [unreadChats, setUnreadChats] = useState<number>(0);

  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || "");
        fetchUnreadChatsCount(session.user.id);
      }
    });

    // Subscribe to changes in private_messages
    const messageSubscription = supabase
      .channel('unread_messages_homepage')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages'
        },
        () => {
          // Refresh unread count when there's a new message
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              fetchUnreadChatsCount(session.user.id);
            }
          });
        }
      )
      .subscribe();
      
    // Also subscribe to updates (when messages are marked as read)
    const updateSubscription = supabase
      .channel('read_messages_homepage')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages'
        },
        () => {
          // Refresh unread count when messages are marked as read
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              fetchUnreadChatsCount(session.user.id);
            }
          });
        }
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
      updateSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (state.selectedCountry) {
      const cities = getCitiesByCountry(state.selectedCountry);
      setState(prev => ({ ...prev, cities, selectedCity: cities[0] }));
    }
  }, [state.selectedCountry]);

  const fetchUnreadChatsCount = async (userId: string) => {
    try {
      // Get all chats where the current user is either user1 or user2
      const { data: chatsData, error: chatsError } = await supabase
        .from('private_chats')
        .select('id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      
      if (chatsError) throw chatsError;
      
      if (chatsData && chatsData.length > 0) {
        // Get all unread messages in these chats
        const chatIds = chatsData.map(chat => chat.id);
        
        const { count, error: countError } = await supabase
          .from('private_messages')
          .select('*', { count: 'exact', head: true })
          .in('chat_id', chatIds)
          .neq('sender_id', userId)
          .is('read_at', null);
        
        if (countError) throw countError;
        
        setUnreadChats(count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread chats count:', error);
    }
  };

  function handleCountrySelect(country: string) {
    setState(prev => ({ ...prev, selectedCountry: country }));
  }

  function handleCitySelect(city: string) {
    setState(prev => ({ ...prev, selectedCity: city }));
  }

  function handleResetLocation() {
    setState(prev => ({
      ...prev,
      selectedCountry: getCountries()[0].name,
      selectedCity: getCountries()[0].cities[0]
    }));
  }

  return (
    <>
      <Header unreadChats={unreadChats} userEmail={userEmail} />
      
      <div className="flex flex-col lg:flex-row lg:items-start p-3 sm:p-6 lg:p-8 mt-24 sm:mt-20 mb-32 sm:mb-28 lg:mb-32">
        <div className="flex flex-col gap-4 mb-4 lg:mb-0 max-w-md lg:max-w-xl mx-auto lg:mx-0 lg:ml-auto w-full">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              ease: [0.6, -0.05, 0.01, 0.99]
            }}
          >
            <div className="relative overflow-hidden rounded-[32px] bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)] p-4 sm:p-5">
              {/* Prismatic edge effect */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
              
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-cyan-300 font-semibold">Ubicación</h2>
                <motion.button
                  onClick={handleResetLocation}
                  className="ml-auto relative overflow-hidden rounded-xl bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 flex items-center gap-2 px-3 py-1.5 text-sm shadow-[0_2px_5px_rgba(31,38,135,0.1)]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <MapPinOff className="w-3.5 h-3.5 text-cyan-300" strokeWidth={2.5} />
                  <span className="text-cyan-300 font-medium">Reestablecer</span>
                </motion.button>
              </div>
              <div className="space-y-4">
                <CountrySelector
                  items={state.countries.map(c => c.name)}
                  selected={state.selectedCountry}
                  onSelect={handleCountrySelect}
                />
                <CitySelector
                  items={state.cities}
                  selected={state.selectedCity}
                  onSelect={handleCitySelect}
                />
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.1,
              ease: [0.6, -0.05, 0.01, 0.99]
            }}
          >
            <PrivateChatsList />
          </motion.div>
          
          {/* <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.2,
              ease: [0.6, -0.05, 0.01, 0.99]
            }}
          >
            <UsersList />
          </motion.div> */}
        </div>
        
        <motion.div
          className="mt-4 lg:mt-0 max-w-md lg:max-w-xl mx-auto lg:mx-0 lg:mr-auto w-full lg:ml-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.2,
            ease: [0.6, -0.05, 0.01, 0.99]
          }}
        >
          <HallButtons />
          <CircularMenu selectedCity={state.selectedCity} />
        </motion.div>
      </div>
    </>
  );
} 