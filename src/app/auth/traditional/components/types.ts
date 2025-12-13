import { z } from "zod"

export const formSchema = z.object({
  email: z.string().email("Enter a valid email to continue."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  fullName: z
    .string()
    .trim()
    .max(120, "Name is a bit too long.")
    .optional(),
})

export type FormValues = z.infer<typeof formSchema>
