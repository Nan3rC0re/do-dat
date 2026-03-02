import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  return (
    <div className="max-w-sm w-full h-full flex flex-col">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <LoginForm />
      </div>
    </div>
  );
}
