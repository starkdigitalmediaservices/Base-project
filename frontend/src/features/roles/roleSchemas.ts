import { z } from 'zod';

export const ROLE_NAME_PATTERN = /^[a-z][a-z0-9_]{1,49}$/;

export const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(
      ROLE_NAME_PATTERN,
      'Use 2–50 lowercase letters, numbers or underscores, starting with a letter.',
    ),
  description: z.string().trim().max(255, 'Description must be at most 255 characters.'),
});

export type RoleFormValues = z.infer<typeof roleSchema>;

export const ROLE_FORM_FIELDS = ['name', 'description'] as const;
