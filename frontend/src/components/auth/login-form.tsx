"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

import { AuthShell } from "@/components/auth/auth-shell";
import {
  authInputClassName,
  authLabelClassName,
} from "@/components/auth/auth-form-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthError, login } from "@/lib/auth/session";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      const next = searchParams.get("next") ?? "/app";
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Sign in to OCRFlow"
      description="Access your pipelines, projects, and canvas workspace."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href={`/signup${searchParams.get("next") ? `?next=${searchParams.get("next")}` : ""}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="email" className={authLabelClassName}>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={authInputClassName}
            placeholder="you@company.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className={authLabelClassName}>
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={authInputClassName}
            placeholder="••••••••"
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-lg font-semibold shadow-[0_8px_24px_-10px_var(--accent)]"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </motion.form>
    </AuthShell>
  );
}
