import { supabase } from "@/lib/supabase";

/** Credits charged per identification quiz attempt. */
export const QUIZ_COST = 3;

/**
 * Deducts `amount` credits from the signed-in user via the `spend_credits` RPC.
 *
 * Fail-OPEN by design: if Supabase is absent, or the RPC errors (e.g. the SQL
 * hasn't been deployed yet), we return `{ ok: true }` so the feature still works
 * rather than breaking the app. `{ ok: false }` is returned ONLY when the server
 * explicitly reports an insufficient balance.
 */
export async function spendCredits(amount: number): Promise<{ ok: boolean; balance: number | null }> {
  if (!supabase) return { ok: true, balance: null };
  try {
    const { data, error } = await supabase.rpc("spend_credits", { amount });
    if (error) return { ok: true, balance: null };
    const balance = (data as number | null) ?? -1;
    if (balance < 0) return { ok: false, balance: null };
    return { ok: true, balance };
  } catch {
    return { ok: true, balance: null };
  }
}
