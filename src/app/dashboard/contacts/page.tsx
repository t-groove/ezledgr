import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { getContacts } from "./actions";
import ContactsClient from "./ContactsClient";

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const contacts = await getContacts();

  return <ContactsClient initialContacts={contacts} />;
}
