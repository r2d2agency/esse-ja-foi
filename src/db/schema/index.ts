import { pgTable, uuid, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const appRoleEnum = pgEnum('app_role', ['admin', 'operacao', 'vistoriador', 'comprador']);

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome'),
  telefone: text('telefone'),
  whatsapp: text('whatsapp'),
  email: text('email').unique().notNull(),
  role: appRoleEnum('role').default('comprador').notNull(),
  ativo: boolean('ativo').default(true).notNull(),
  criado_em: timestamp('criado_em').defaultNow().notNull(),
});

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  whatsapp: text('whatsapp').notNull(),
  cidade: text('cidade'),
  marca: text('marca'),
  modelo: text('modelo'),
  ano: text('ano'),
  mensagem: text('mensagem'),
  origem: text('origem'),
  campanha: text('campanha'),
  status: text('status').default('novo').notNull(),
  responsavel_id: uuid('responsavel_id').references(() => profiles.id),
  tentativas_contato: text('tentativas_contato'),
  convertido_cliente_id: uuid('convertido_cliente_id'),
  criado_em: timestamp('criado_em').defaultNow().notNull(),
});

export const veiculos = pgTable('veiculos', {
  id: uuid('id').primaryKey().defaultRandom(),
  placa: text('placa').unique().notNull(),
  marca: text('marca').notNull(),
  modelo: text('modelo').notNull(),
  ano_fabricacao: text('ano_fabricacao'),
  ano_modelo: text('ano_modelo'),
  status: text('status').default('cadastrado').notNull(),
  criado_em: timestamp('criado_em').defaultNow().notNull(),
});

export const leiloes = pgTable('leiloes', {
  id: uuid('id').primaryKey().defaultRandom(),
  veiculo_id: uuid('veiculo_id').references(() => veiculos.id).notNull(),
  inicio_em: timestamp('inicio_em').notNull(),
  fim_em: timestamp('fim_em').notNull(),
  lance_inicial: text('lance_inicial').notNull(),
  status: text('status').default('agendado').notNull(),
  criado_em: timestamp('criado_em').defaultNow().notNull(),
});

import { relations } from 'drizzle-orm';

export const veiculosRelations = relations(veiculos, ({ many }) => ({
  leiloes: many(leiloes),
}));

export const leiloesRelations = relations(leiloes, ({ one }) => ({
  veiculo: one(veiculos, {
    fields: [leiloes.veiculo_id],
    references: [veiculos.id],
  }),
}));

