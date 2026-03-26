import { createSupabaseServer } from "../lib/supabase-server";
import HomeClient from "./HomeClient";

export default async function Page() {
  const supabase = await createSupabaseServer();

  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  return <HomeClient initialListings={data || []} />;
}