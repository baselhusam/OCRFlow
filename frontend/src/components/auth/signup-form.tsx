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
import { AuthError, signup } from "@/lib/auth/session";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signup(email, password, fullName || undefined);
      const next = searchParams.get("next") ?? "/app";
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Unable to create account");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      description="Start building composable OCR pipelines under your control."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/login${searchParams.get("next") ? `?next=${searchParams.get("next")}` : ""}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
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
          <Label htmlFor="fullName" className={authLabelClassName}>
            Full name
            <span className="ml-1 normal-case tracking-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={authInputClassName}
            placeholder="Ada Lovelace"
          />
        </div>

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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={authInputClassName}
            placeholder="At least 8 characters"
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
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </motion.form>
    </AuthShell>
  );
}
