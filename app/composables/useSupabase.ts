import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabaseクライアントのシングルトンインスタンス
let supabase: SupabaseClient | null = null;

/**
 * Supabaseクライアントを取得するComposable
 * @returns Supabaseクライアントインスタンス
 */
export const useSupabase = () => {
    if (supabase) {
        return supabase;
    }
    const config = useRuntimeConfig();
    const supabaseUrl = config.public.supabaseUrl as string;
    const supabaseAnonKey = config.public.supabaseAnonKey as string;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Supanase URL and Anon Key must be provided in enviroment variables'
        );
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
        },
    })

    return supabase;
}

/**
 * Storageバケット名の定数
 */
export const STORAGE_BUCKET = 'catGallery';
