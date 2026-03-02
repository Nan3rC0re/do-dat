import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignUpForm from "@/components/auth/signup-form";
import Image from "next/image";

export default async function SignUpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  return (
    <div className="max-w-sm w-full h-full flex flex-col">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create your account
        </h1>
        <SignUpForm />
      </div>
    </div>
  );
}
