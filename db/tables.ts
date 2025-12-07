/**
 * Unit & Currency Converter - convert units and currencies.
 *
 * Design goals:
 * - Store history of conversions for quick reuse and learning.
 * - Distinguish unit vs currency conversions.
 * - Allow users to save favorite conversion pairs.
 */

import { defineTable, column, NOW } from "astro:db";

export const ConversionHistory = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),

    // type: "unit" or "currency"
    conversionType: column.text({ optional: true }),

    // units or currency codes
    fromUnit: column.text(),                               // "meter", "USD", "Celsius"
    toUnit: column.text(),                                 // "feet", "INR", "Fahrenheit"
    fromValue: column.number(),
    resultValue: column.number(),

    // optional metadata
    category: column.text({ optional: true }),             // "length", "weight", "temperature", "money"
    rateUsed: column.number({ optional: true }),           // for currency
    rateTimestamp: column.date({ optional: true }),        // when rate was valid
    createdAt: column.date({ default: NOW }),
  },
});

export const FavoriteConversions = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    conversionType: column.text({ optional: true }),
    fromUnit: column.text(),
    toUnit: column.text(),
    category: column.text({ optional: true }),
    label: column.text({ optional: true }),                // e.g. "USD -> AED daily"
    createdAt: column.date({ default: NOW }),
  },
});

export const tables = {
  ConversionHistory,
  FavoriteConversions,
} as const;
