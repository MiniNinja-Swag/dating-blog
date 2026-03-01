import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';

export const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    {
        auth: {
            storage: storage,             // <— persist session here
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
        },
    }
);

export default supabase;
