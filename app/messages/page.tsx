import MessagesClient from "./MessagesClient";
import { createSupabaseServer } from "../../lib/supabase-server";

export default async function MessagesPage() {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: conversations } = await supabase
    .from("conversations")
    .select(`
      *,
      listings (
        lesson_title,
        activity_type,
        provider_name
      )
    `)
    .or(`seeker_id.eq.${user.id},provider_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false });

  return (
    <MessagesClient
      initialConversations={conversations || []}
      user={user}
    />
  );
}