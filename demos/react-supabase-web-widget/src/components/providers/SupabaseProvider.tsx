import { createClient, SupabaseClient } from '@supabase/supabase-js';
import React, { PropsWithChildren, useState } from 'react';

const SupabaseContext = React.createContext<{ client: SupabaseClient }>({} as any);
export const useSupabase = () => React.useContext(SupabaseContext);

const SupabaseProvider: React.FC<PropsWithChildren> = (props) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const [client] = useState(() =>
    createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true
      }
    })
  );

  return <SupabaseContext.Provider value={{ client }}>{props.children}</SupabaseContext.Provider>;
};

export default SupabaseProvider;
