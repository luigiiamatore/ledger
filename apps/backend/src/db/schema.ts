import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bankTransactionId: text('bank_transaction_id').notNull().unique(),
  date: text('date').notNull(),
  rawDescription: text('raw_description').notNull(),
  merchantName: text('merchant_name'),
  amount: real('amount').notNull(),
  currency: text('currency').notNull(),
  baseAmountEur: real('base_amount_eur').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
});

export const merchantCache = sqliteTable('merchant_cache', {
  merchantName: text('merchant_name').primaryKey(),
  categoryId: integer('category_id').notNull().references(() => categories.id),
});
