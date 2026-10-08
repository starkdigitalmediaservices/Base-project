import { z } from 'zod';

import { passwordSchema } from '@/features/users/userSchemas';

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .max(150, 'Name must be at most 150 characters.'),
});

export type ProfileValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password.'),
    new_password: passwordSchema,
    confirm_password: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  })
  .refine((values) => values.new_password !== values.current_password, {
    message: 'The new password must be different from the current one.',
    path: ['new_password'],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
