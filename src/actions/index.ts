import type { ActionAPIContext } from "astro:actions";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import {
  ConversionHistory,
  FavoriteConversions,
  and,
  db,
  desc,
  eq,
  sql,
} from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

export const server = {
  createConversionHistory: defineAction({
    input: z.object({
      conversionType: z.enum(["unit", "currency"]).optional(),
      fromUnit: z.string().min(1),
      toUnit: z.string().min(1),
      fromValue: z.number(),
      resultValue: z.number(),
      category: z.string().min(1).optional(),
      rateUsed: z.number().optional(),
      rateTimestamp: z.coerce.date().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const conversion = {
        id: crypto.randomUUID(),
        userId: user.id,
        conversionType: input.conversionType,
        fromUnit: input.fromUnit,
        toUnit: input.toUnit,
        fromValue: input.fromValue,
        resultValue: input.resultValue,
        category: input.category,
        rateUsed: input.rateUsed,
        rateTimestamp: input.rateTimestamp,
        createdAt: now,
      } satisfies typeof ConversionHistory.$inferInsert;

      await db.insert(ConversionHistory).values(conversion);

      return {
        success: true,
        data: { conversion },
      };
    },
  }),

  listConversionHistory: defineAction({
    input: z.object({
      conversionType: z.enum(["unit", "currency"]).optional(),
      category: z.string().min(1).optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().max(100).default(20),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const filters = [eq(ConversionHistory.userId, user.id)];

      if (input.conversionType) {
        filters.push(eq(ConversionHistory.conversionType, input.conversionType));
      }

      if (input.category) {
        filters.push(eq(ConversionHistory.category, input.category));
      }

      const where = and(...filters);

      const [{ value: total }] = await db
        .select({ value: sql<number>`count(*)` })
        .from(ConversionHistory)
        .where(where);

      const items = await db
        .select()
        .from(ConversionHistory)
        .where(where)
        .orderBy(desc(ConversionHistory.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return {
        success: true,
        data: {
          items,
          total,
        },
      };
    },
  }),

  deleteConversionHistory: defineAction({
    input: z.object({ id: z.string().min(1) }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const where = and(
        eq(ConversionHistory.id, input.id),
        eq(ConversionHistory.userId, user.id)
      );

      const [existing] = await db
        .select()
        .from(ConversionHistory)
        .where(where)
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Conversion not found.",
        });
      }

      await db.delete(ConversionHistory).where(where);

      return { success: true };
    },
  }),

  createFavoriteConversion: defineAction({
    input: z.object({
      conversionType: z.enum(["unit", "currency"]).optional(),
      fromUnit: z.string().min(1),
      toUnit: z.string().min(1),
      category: z.string().min(1).optional(),
      label: z.string().min(1).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const favorite = {
        id: crypto.randomUUID(),
        userId: user.id,
        conversionType: input.conversionType,
        fromUnit: input.fromUnit,
        toUnit: input.toUnit,
        category: input.category,
        label: input.label,
        createdAt: new Date(),
      } satisfies typeof FavoriteConversions.$inferInsert;

      await db.insert(FavoriteConversions).values(favorite);

      return {
        success: true,
        data: { favorite },
      };
    },
  }),

  updateFavoriteConversion: defineAction({
    input: z.object({
      id: z.string().min(1),
      conversionType: z.enum(["unit", "currency"]).optional(),
      fromUnit: z.string().min(1).optional(),
      toUnit: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      label: z.string().min(1).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const where = and(
        eq(FavoriteConversions.id, input.id),
        eq(FavoriteConversions.userId, user.id)
      );

      const [existing] = await db
        .select()
        .from(FavoriteConversions)
        .where(where)
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Favorite not found.",
        });
      }

      const updates: Partial<typeof FavoriteConversions.$inferInsert> = {};

      if (input.conversionType !== undefined) updates.conversionType = input.conversionType;
      if (input.fromUnit !== undefined) updates.fromUnit = input.fromUnit;
      if (input.toUnit !== undefined) updates.toUnit = input.toUnit;
      if (input.category !== undefined) updates.category = input.category;
      if (input.label !== undefined) updates.label = input.label;

      if (Object.keys(updates).length === 0) {
        return {
          success: true,
          data: { favorite: existing },
        };
      }

      await db.update(FavoriteConversions).set(updates).where(where);

      return {
        success: true,
        data: { favorite: { ...existing, ...updates } },
      };
    },
  }),

  deleteFavoriteConversion: defineAction({
    input: z.object({ id: z.string().min(1) }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const where = and(
        eq(FavoriteConversions.id, input.id),
        eq(FavoriteConversions.userId, user.id)
      );

      const [existing] = await db
        .select()
        .from(FavoriteConversions)
        .where(where)
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Favorite not found.",
        });
      }

      await db.delete(FavoriteConversions).where(where);

      return { success: true };
    },
  }),

  listFavoriteConversions: defineAction({
    input: z.object({
      conversionType: z.enum(["unit", "currency"]).optional(),
      category: z.string().min(1).optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().max(100).default(50),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const filters = [eq(FavoriteConversions.userId, user.id)];

      if (input.conversionType) {
        filters.push(eq(FavoriteConversions.conversionType, input.conversionType));
      }

      if (input.category) {
        filters.push(eq(FavoriteConversions.category, input.category));
      }

      const where = and(...filters);

      const [{ value: total }] = await db
        .select({ value: sql<number>`count(*)` })
        .from(FavoriteConversions)
        .where(where);

      const items = await db
        .select()
        .from(FavoriteConversions)
        .where(where)
        .orderBy(desc(FavoriteConversions.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return {
        success: true,
        data: {
          items,
          total,
        },
      };
    },
  }),
};
