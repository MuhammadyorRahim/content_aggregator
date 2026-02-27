import { z } from "zod";

import { SOURCE_TYPES, USER_THEMES } from "@/lib/constants";

const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-zA-Z]/, "Must contain at least one letter")
  .regex(/[0-9]/, "Must contain at least one number");

export const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1).max(100),
  inviteCode: z.string().trim().max(64).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  timezone: z.string().min(1).max(100).optional(),
  theme: z.enum(USER_THEMES).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const addSourceSchema = z.object({
  type: z.enum(SOURCE_TYPES),
  url: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
});

export const updateSubscriptionSchema = z.object({
  customName: z.string().min(1).max(100).optional(),
  mutedUntil: z.coerce.date().nullable().optional(),
});

export const updatePostStateSchema = z
  .object({
    isRead: z.boolean().optional(),
    isSaved: z.boolean().optional(),
  })
  .refine((value) => value.isRead !== undefined || value.isSaved !== undefined, {
    message: "At least one field is required",
  });

export const batchReadSchema = z.object({
  postIds: z.array(z.string().cuid()).min(1),
});

export const markAllReadSchema = z.object({
  sourceId: z.string().cuid().optional(),
});

export const scheduleCreateSchema = z.object({
  postId: z.string().cuid(),
  title: z.string().min(1).max(200),
  scheduledAt: z.coerce.date(),
});

export const scheduleUpdateSchema = z.object({
  scheduledAt: z.coerce.date(),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
});

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminUpdateUserSchema = z.object({
  enabled: z.boolean(),
});

export const adminUpdateSourceSchema = z
  .object({
    url: z.string().min(1).optional(),
    name: z.string().min(1).max(100).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => value.url !== undefined || value.name !== undefined || value.enabled !== undefined, {
    message: "At least one field is required",
  });

export const createInviteCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/)
    .min(4)
    .max(64)
    .optional(),
  expiresAt: z.coerce.date().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddSourceInput = z.infer<typeof addSourceSchema>;
export type UpdatePostStateInput = z.infer<typeof updatePostStateSchema>;
