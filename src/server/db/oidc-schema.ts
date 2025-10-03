import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const oidcTokens = sqliteTable(
  'oidc_tokens',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    payload: text('payload').notNull(),
    grantId: text('grant_id'),
    userCode: text('user_code'),
    uid: text('uid'),
    expiresAt: integer('expires_at').notNull(),
    consumedAt: integer('consumed_at'),
  },
  (table) => ({
    grantIdx: index('oidc_tokens_grant_idx').on(table.grantId),
    userCodeIdx: index('oidc_tokens_user_code_idx').on(table.userCode),
    uidIdx: index('oidc_tokens_uid_idx').on(table.uid),
    typeExpiresIdx: index('oidc_tokens_type_exp_idx').on(table.type, table.expiresAt),
  }),
)

export type OidcToken = typeof oidcTokens.$inferSelect
export type NewOidcToken = typeof oidcTokens.$inferInsert
