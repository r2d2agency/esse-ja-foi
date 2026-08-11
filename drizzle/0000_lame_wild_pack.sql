CREATE TYPE "public"."app_role" AS ENUM('admin', 'operacao', 'vistoriador', 'comprador');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"whatsapp" text NOT NULL,
	"cidade" text,
	"marca" text,
	"modelo" text,
	"ano" text,
	"mensagem" text,
	"origem" text,
	"campanha" text,
	"status" text DEFAULT 'novo' NOT NULL,
	"responsavel_id" uuid,
	"tentativas_contato" text,
	"convertido_cliente_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leiloes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"veiculo_id" uuid NOT NULL,
	"inicio_em" timestamp NOT NULL,
	"fim_em" timestamp NOT NULL,
	"lance_inicial" text NOT NULL,
	"status" text DEFAULT 'agendado' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text,
	"telefone" text,
	"whatsapp" text,
	"email" text NOT NULL,
	"role" "app_role" DEFAULT 'comprador' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "veiculos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placa" text NOT NULL,
	"marca" text NOT NULL,
	"modelo" text NOT NULL,
	"ano_fabricacao" text,
	"ano_modelo" text,
	"status" text DEFAULT 'cadastrado' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "veiculos_placa_unique" UNIQUE("placa")
);
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_responsavel_id_profiles_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leiloes" ADD CONSTRAINT "leiloes_veiculo_id_veiculos_id_fk" FOREIGN KEY ("veiculo_id") REFERENCES "public"."veiculos"("id") ON DELETE no action ON UPDATE no action;