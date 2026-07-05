import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { checkAndDeductCredits, CREDIT_COSTS } from '@/lib/credits';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasCredits = await checkAndDeductCredits(userId, CREDIT_COSTS.SFX);
    if (!hasCredits) return NextResponse.json({ error: 'QUOTA_EXCEEDED' }, { status: 402 });

    const body = await req.json();
    const { prompt } = body;

    // ElevenLabs Sound Effects API is synchronous and usually fast enough for Vercel Serverless
    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: prompt,
        duration_seconds: 3, // keep it short for fast generation
        prompt_influence: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs Error:', errorText);
      throw new Error('Failed to generate sound effect from ElevenLabs');
    }

    const audioBuffer = await response.arrayBuffer();

    // Generate unique ID
    const genId = crypto.randomUUID();
    const fileName = `generated/${genId}.mp3`;

    // Upload directly to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(fileName);

    // Save to DB
    const { data: genRecord, error: dbError } = await supabase
      .from('generations')
      .insert({
        id: genId,
        user_id: userId,
        asset_type: 'sfx',
        media_url: urlData.publicUrl,
        prompt: prompt,
        status: 'completed', // Synchornous, so it's completed immediately
      })
      .select('id')
      .single();

    if (dbError) throw dbError;

    // We return 'completed' status and the URL immediately, so the frontend doesn't need to poll
    return NextResponse.json({ id: genRecord.id, status: 'completed', url: urlData.publicUrl });
  } catch (error: any) {
    console.error('SFX Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
