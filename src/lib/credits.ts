import { supabase } from './supabase';

export const CREDIT_COSTS = {
  SPRITE: 1,
  CONTROLNET: 3,
  SFX: 5,
  MUSIC: 15,
};

export async function checkAndDeductCredits(userId: string, amount: number): Promise<boolean> {
  // 1. Fetch current credits
  const { data, error } = await supabase
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Failed to fetch user credits:', error);
    return false;
  }

  if (data.credits < amount) {
    return false; // Not enough credits
  }

  // 2. Deduct credits
  const { error: updateError } = await supabase
    .from('users')
    .update({ credits: data.credits - amount })
    .eq('id', userId);

  if (updateError) {
    console.error('Failed to deduct credits:', updateError);
    return false;
  }

  return true;
}
