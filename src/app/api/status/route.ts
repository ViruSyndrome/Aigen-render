import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ online: true, mode: 'replicate' }, { status: 200 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: genRecord, error } = await supabase
      .from('generations')
      .select('id, status, media_url, asset_type, provider_job_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !genRecord) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // ─── Local Dev Fallback: Poll Replicate if still processing ───
    if (genRecord.status === 'processing' && genRecord.provider_job_id) {
      try {
        const prediction = await replicate.predictions.get(genRecord.provider_job_id);
        
        if (prediction.status === 'succeeded' && prediction.output) {
          const fileUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
          
          const fileResponse = await fetch(fileUrl);
          if (fileResponse.ok) {
            const arrayBuffer = await fileResponse.arrayBuffer();
            const extension = genRecord.asset_type === 'music' ? 'mp3' : 'png';
            const contentType = genRecord.asset_type === 'music' ? 'audio/mpeg' : 'image/png';
            const fileName = `generated/${id}.${extension}`;
            
            const { error: uploadError } = await supabase.storage
              .from('assets')
              .upload(fileName, arrayBuffer, {
                contentType,
                upsert: true
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('assets').getPublicUrl(fileName);
              
              await supabase
                .from('generations')
                .update({ status: 'completed', media_url: urlData.publicUrl })
                .eq('id', id);
                
              return NextResponse.json({ id, status: 'completed', url: urlData.publicUrl, assetType: genRecord.asset_type });
            }
          }
        } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
          await supabase.from('generations').update({ status: prediction.status }).eq('id', id);
          return NextResponse.json({ id, status: prediction.status, url: null, assetType: genRecord.asset_type });
        }
      } catch (pollErr) {
        console.error('Replicate fallback polling error:', pollErr);
      }
    }

    return NextResponse.json({
      id: genRecord.id,
      status: genRecord.status,
      url: genRecord.media_url,
      assetType: genRecord.asset_type
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
