import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import Replicate from 'replicate';
import { checkAndDeductCredits, CREDIT_COSTS } from '@/lib/credits';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const WEBHOOK_HOST = process.env.NEXT_PUBLIC_SITE_URL || 'https://placeholder.ngrok.app';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasCredits = await checkAndDeductCredits(userId, CREDIT_COSTS.MUSIC);
    if (!hasCredits) return NextResponse.json({ error: 'QUOTA_EXCEEDED' }, { status: 402 });

    const body = await req.json();
    const { prompt } = body;

    // 1. Create DB Record (Status: processing, AssetType: music)
    const { data: genRecord, error: dbError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        asset_type: 'music',
        media_url: '',
        prompt: prompt,
        status: 'processing',
        metadata: { stage: 'generate' }
      })
      .select('id')
      .single();

    if (dbError || !genRecord) throw new Error('Failed to create DB record');

    // 2. Dispatch job to Replicate (meta/musicgen)
    // Note: MusicGen returns an audio file. Webhook structure remains the same.
    const prediction = await replicate.predictions.create({
      version: "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
      input: {
        prompt: prompt,
        duration: 8,
        output_format: "mp3",
      },
      webhook: `${WEBHOOK_HOST}/api/webhooks/replicate?id=${genRecord.id}`,
      webhook_events_filter: ["completed"],
    });

    // 3. Save job ID
    await supabase
      .from('generations')
      .update({ provider_job_id: prediction.id })
      .eq('id', genRecord.id);

    return NextResponse.json({ id: genRecord.id, status: 'processing' });
  } catch (error) {
    console.error('MusicGen Error:', error);
    return NextResponse.json({ error: 'Failed to start music generation' }, { status: 500 });
  }
}
