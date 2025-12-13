"use client"

import { Eye, EyeOff } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { cn } from "@/lib/utils"

import type { FormValues } from "./types"

export type TraditionalAuthFormProps = {
  form: UseFormReturn<FormValues>
  isSignUp: boolean
  pending: boolean
  passwordVisible: boolean
  formError: string | null
  onSubmit: (values: FormValues) => Promise<void>
  onTogglePassword: () => void
}

export function TraditionalAuthForm({
  form,
  isSignUp,
  pending,
  passwordVisible,
  formError,
  onSubmit,
  onTogglePassword,
}: TraditionalAuthFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-[clamp(1rem,3vh,1.5rem)]">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem
              className={cn(
                "transition-all duration-200",
                isSignUp ? "opacity-100" : "pointer-events-none opacity-0 invisible"
              )}
              aria-hidden={!isSignUp}
            >
              <FormLabel className="text-sm font-semibold text-card-foreground">
                Full name
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Name Surname"
                  disabled={pending || !isSignUp}
                  className="h-12 rounded-2xl border border-primary/20 bg-white/80 text-base"
                  data-cy="auth-fullname-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-card-foreground">Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  autoComplete="email"
                  placeholder="you@gmail.com"
                  disabled={pending}
                  className="h-12 rounded-2xl border border-primary/20 bg-white/80 text-base"
                  data-cy="auth-email-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-card-foreground">Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    type={passwordVisible ? "text" : "password"}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    placeholder="At least 6 characters"
                    disabled={pending}
                    className="h-12 rounded-2xl border border-primary/20 bg-white/80 pr-12 text-base"
                    data-cy="auth-password-input"
                  />
                  <button
                    type="button"
                    aria-label={passwordVisible ? "Hide password" : "Show password"}
                    onClick={onTogglePassword}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground/80 transition hover:text-muted-foreground disabled:opacity-50"
                    disabled={pending}
                  >
                    {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {formError ? (
          <p className="text-sm font-semibold text-destructive">{formError}</p>
        ) : null}

        <Button
          type="submit"
          className="h-12 w-full rounded-2xl bg-button-background text-lg font-semibold text-button-foreground transition hover:bg-button-hover-background"
          disabled={pending}
          data-cy="auth-submit"
        >
          {pending
            ? isSignUp
              ? "Creating your space..."
              : "Signing you in..."
            : isSignUp
            ? "Create account"
            : "Sign in"}
        </Button>
      </form>
    </Form>
  )
}
