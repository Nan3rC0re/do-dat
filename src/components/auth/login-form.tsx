"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction, type AuthState } from "@/lib/actions/auth";

const initialState: AuthState = {};

export default function LoginForm() {
  const [state, dispatch, isPending] = useActionState(
    loginAction,
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
          autoComplete="current-password"
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
        {isPending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-primary hover:underline font-medium"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
