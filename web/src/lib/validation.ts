import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').trim(),
})

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, 'Enter your full name.')
    .regex(/^[A-Za-z\s'-]+$/, 'Use letters only for your full name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z
    .string()
    .trim()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Include at least one uppercase letter.')
    .regex(/[0-9]/, 'Include at least one number.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>

export function getFieldErrors<T extends Record<string, unknown>>(
  schema: z.ZodSchema<T>,
  values: T
) {
  const parsed = schema.safeParse(values)

  if (parsed.success) {
    return {} as Partial<Record<keyof T, string>>
  }

  const fieldErrors: Partial<Record<keyof T, string>> = {}

  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof T | undefined
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = issue.message
    }
  }

  return fieldErrors
}
