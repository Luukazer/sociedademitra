import { createClient } from "@/lib/supabase/server";
import MasterPanel from "@/components/master-panel";

export default async function MasterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <MasterPanel initialUser={user?.email ?? null} />;
}
