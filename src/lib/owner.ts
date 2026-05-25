import { supabase } from "./supabase";

export type Owner = {
  id: string;
  name: string;
  leader_code: string | null;
  is_admin: boolean;
  is_leader: boolean;
};

export type OwnerLookup =
  | { kind: "no-session" }
  | { kind: "incomplete-signup" } // signed in but missing user_metadata.leader_code
  | { kind: "error"; message: string }
  | { kind: "ok"; owner: Owner };

// Look up the current user's owners row, creating it on first sign-in
// from the name + leader_code stashed in auth user_metadata at signup time.
export async function getOrCreateOwner(): Promise<OwnerLookup> {
  // getSession returns null cleanly when there's no session — getUser would
  // throw "Auth session missing!" which we'd have to special-case.
  const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) return { kind: "error", message: sessionErr.message };
  const user = sessionRes?.session?.user;
  if (!user) return { kind: "no-session" };

  const { data: existing, error: readErr } = await supabase
    .from("owners")
    .select("id, name, leader_code, is_admin, is_leader")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (readErr) return { kind: "error", message: readErr.message };
  if (existing) return { kind: "ok", owner: existing as Owner };

  // First sign-in: pull name + leader_code from user_metadata.
  const meta = (user.user_metadata ?? {}) as {
    name?: string;
    leader_code?: string;
  };
  const name = (meta.name ?? user.email?.split("@")[0] ?? "Champion").trim();
  const leader_code = meta.leader_code?.trim().toUpperCase();

  if (!leader_code) {
    return { kind: "incomplete-signup" };
  }

  const { data: created, error: insertErr } = await supabase
    .from("owners")
    .insert({
      auth_user_id: user.id,
      name,
      email: user.email,
      leader_code,
    })
    .select("id, name, leader_code, is_admin, is_leader")
    .single();

  if (insertErr) return { kind: "error", message: insertErr.message };
  return { kind: "ok", owner: created as Owner };
}

export async function signOut() {
  await supabase.auth.signOut();
}
