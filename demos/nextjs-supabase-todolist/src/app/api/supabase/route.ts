import { SupabaseConfig } from '@/library/powersync/SupabaseConnector';

import { NextRequest, NextResponse } from 'next/server';

/**
 * This route exposes Supabase credentials to the client.
 */
export async function GET(request: NextRequest): Promise<NextResponse<SupabaseConfig>> {
  // TODO add any required auth logic if necessary to secure these variables
  return NextResponse.json(
    {
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
      powersyncUrl: process.env.POWERSYNC_URL!
    },
    {
      status: 200
    }
  );
}
