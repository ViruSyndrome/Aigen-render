import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import Replicate from 'replicate';
import { checkAndDeductCredits, CREDIT_COSTS } from '@/lib/credits';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Used for local testing webhook delivery via ngrok, or production URL
const WEBHOOK_HOST = process.env.NEXT_PUBLIC_SITE_URL || 'https://placeholder.ngrok.app';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, negative_prompt, width, height, cfg, steps, assetType = 'sprite', uploadedImageName, denoiseStrength } = body;

    // Check Credits
    // If denoiseStrength is passed and < 0.4, it's a ControlNet consistency generation
    const isControlNet = uploadedImageName && denoiseStrength && denoiseStrength < 0.4;
    const cost = isControlNet ? CREDIT_COSTS.CONTROLNET : CREDIT_COSTS.SPRITE;

    const hasCredits = await checkAndDeductCredits(userId, cost);
    if (!hasCredits) {
      return NextResponse.json({ error: 'QUOTA_EXCEEDED' }, { status: 402 });
    }

    // 1. Create a placeholder record in Supabase
    const { data: genRecord, error: dbError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        asset_type: assetType,
        media_url: '', // will be updated by webhook
        prompt: prompt,
        negative_prompt: negative_prompt || '',
        status: 'processing',
        metadata: { cfg, steps, width, height, stage: 'generate' }
      })
      .select('id')
      .single();

    if (dbError || !genRecord) {
      console.error('DB Insert Error:', dbError);
      throw new Error('Failed to create generation record');
    }

    // 2. Dispatch job to Replicate (Flux Schnell)
    // Fast, cheap, and handles sprites/assets well.
    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-schnell",
      input: {
        prompt: prompt,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "png",
      },
      webhook: `${WEBHOOK_HOST}/api/webhooks/replicate?id=${genRecord.id}`,
      webhook_events_filter: ["completed"],
    });

    // 3. Save the job ID
    await supabase
      .from('generations')
      .update({ provider_job_id: prediction.id })
      .eq('id', genRecord.id);

    return NextResponse.json({ id: genRecord.id, status: 'processing' });
  } catch (error) {
    console.error('Generation Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
