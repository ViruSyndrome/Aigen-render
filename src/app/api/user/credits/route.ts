import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (error || !data) {
      // If user doesn't exist in our DB yet, they have the default 5 credits from the schema
      // A webhook should ideally create them, but for safety, return 5.
      return NextResponse.json({ credits: 5 });
    }

    return NextResponse.json({ credits: data.credits });
  } catch (error) {
    console.error('Failed to fetch credits:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
