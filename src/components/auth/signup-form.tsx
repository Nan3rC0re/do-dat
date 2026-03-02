"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpAction, type AuthState } from "@/lib/actions/auth";

const initialState: AuthState = {};

export default function SignUpForm() {
  const [state, dispatch, isPending] = useActionState(
    signUpAction,
    initialState,
  );

  return (
    <form action={dispatch} className="space-y-4">
      <div className="space-y-3">
        <Input
          name="email"
          type="email"
          placeholder="Email"
          required
          autoComplete="email"
        />
        <Input
          name="password"
          type="password"
          placeholder="Password"
          required
          autoComplete="new-password"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-500 text-center">{state.error}</p>
      )}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary hover:bg-primary/95 text-white"
      >
        {isPending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary hover:underline font-medium"
        >
          Login
        </Link>
      </p>
    </form>
  );
}
