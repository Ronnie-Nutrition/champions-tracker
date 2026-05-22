import { supabase } from "./supabase";

// Fixed UUID for the single-owner test phase. Session 3 will replace this
// with the logged-in user's owner row from Supabase auth.
export const TEST_OWNER_ID = "00000000-0000-0000-0000-000000000001";
export const TEST_OWNER_NAME = "Ronnie Craig (test)";
export const TEST_LEADER_CODE = "RONNIE2026";

export async function ensureTestOwner() {
  return supabase
    .from("owners")
    .upsert(
      {
        id: TEST_OWNER_ID,
        name: TEST_OWNER_NAME,
        leader_code: TEST_LEADER_CODE,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
}
