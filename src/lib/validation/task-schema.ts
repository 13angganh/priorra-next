import { z } from "zod";

/**
 * Zod schemas for Task, Space, and AppSettings — the runtime
 * validation boundary matching the domain model in
 * src/types/{task,space,settings}.ts (Development Phase #23).
 */

const isoDateString = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: "Must be a valid ISO 8601 date/timestamp string",
});

export const prioritySchema = z
  .number()
  .int()
  .min(1)
  .max(8) as z.ZodType<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>;

export const taskInputSchema = z.object({
  spaceId: z.string().min(1, "spaceId is required"),
  title: z.string().trim().min(1, "Title cannot be empty").max(500),
  note: z.string().max(5000).optional(),
  priority: prioritySchema,
  dueDate: isoDateString.optional(),
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  note: z.string().max(5000).optional(),
  priority: prioritySchema.optional(),
  dueDate: isoDateString.optional(),
  status: z.enum(["pending", "completed"]).optional(),
  sortOrder: z.number().optional(),
});

export const taskSchema = z.object({
  id: z.string().min(1),
  spaceId: z.string().min(1),
  title: z.string().trim().min(1).max(500),
  note: z.string().max(5000).optional(),
  priority: prioritySchema,
  status: z.enum(["pending", "completed"]),
  dueDate: isoDateString.optional(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  completedAt: isoDateString.optional(),
  sortOrder: z.number(),
  syncState: z.enum(["synced", "pending", "error"]),
  localUpdatedAt: isoDateString,
  serverUpdatedAt: isoDateString.optional(),
  syncVersion: z.number().optional(),
  deletedAt: isoDateString.optional(),
});

export type TaskInputParsed = z.infer<typeof taskInputSchema>;
