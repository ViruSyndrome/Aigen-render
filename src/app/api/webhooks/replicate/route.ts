import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const body = await req.json();
    
    if (body.status === 'succeeded' && body.output) {
      // Replicate output format depends on the model. Usually an array for Flux.
      const imageUrl = Array.isArray(body.output) ? body.output[0] : body.output;
      
      // Download from Replicate (because Replicate URLs expire in 1 hr)
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) throw new Error('Failed to fetch image from Replicate');
      
      const arrayBuffer = await imageResponse.arrayBuffer();
      const fileName = `generated/${id}.png`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('assets').getPublicUrl(fileName);

      // Mark completed in DB
      await supabase
        .from('generations')
        .update({ 
          status: 'completed', 
          media_url: urlData.publicUrl 
        })
        .eq('id', id);

    } else if (body.status === 'failed' || body.status === 'canceled') {
      // Mark failed
      await supabase
        .from('generations')
        .update({ status: body.status })
        .eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
