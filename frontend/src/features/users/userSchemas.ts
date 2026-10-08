import { z } from 'zod';

const name = z
  .string()
  .trim()
  .min(1, 'Name is required.')
  .max(150, 'Name must be at most 150 characters.');
const email = z.email('Enter a valid email address.').max(320, 'Email is too long.');
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.');

/** Form values keep role_id as a string (select value); convert on submit. */
export const userCreateSchema = z.object({
  name,
  email,
  password: passwordSchema,
  role_id: z.string().min(1, 'Select a role.'),
  is_active: z.boolean(),
});

export const userEditSchema = userCreateSchema.extend({
  // Leave blank to keep the current password.
  password: z.union([z.literal(''), passwordSchema]),
});

export type UserFormValues = z.infer<typeof userCreateSchema>;

export const USER_FORM_FIELDS = ['name', 'email', 'password', 'role_id', 'is_active'] as const;
