-- ============================================================
-- MIGRATION: CHECKLIST DINAMICO NAO ENGESSADO
-- Tabelas:
--   1) vistorias_checklist_categorias  → Grupo/Categoria de itens
--   2) vistorias_checklist_itens      → Item configuravel admin (pergunta/opcoes/tipo)
--   3) laudo_vistoria_respostas       → Respostas do vistoriador (1 row por item)
-- ============================================================
-- Como usar? (SEED BÁSICO para ter etapas iguais as do wizard atual)
-- Após aplicar, o admin pode adicionar/editar/excluir na aba "Checklist Config"
-- ============================================================

CREATE TABLE IF NOT EXISTS "vistorias_checklist_categorias" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "ordem" integer NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "vistorias_checklist_itens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "categoria_id" uuid NOT NULL REFERENCES vistorias_checklist_categorias(id) ON DELETE CASCADE,
  "titulo" text NOT NULL,
  "descricao_ajuda" text,
  "tipo_item" text NOT NULL DEFAULT 'CONFORMIDADE', -- CONFORMIDADE | TEXTO_LIVRE | NUMERO | CHECKBOX_MULTIPLO | SELECT_UNICO
  "opcoes" jsonb, -- array de opcoes [{valor,label}] para CHECKBOX_MULTIPLO / SELECT_UNICO
  "obrigatorio" boolean NOT NULL DEFAULT true,
  "foto_obrigatoria" boolean NOT NULL DEFAULT false,
  "permite_observacao" boolean NOT NULL DEFAULT true,
  "ordem" integer NOT NULL DEFAULT 0,
  "ativo" boolean NOT NULL DEFAULT true,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vistorias_checklist_itens_categoria ON vistorias_checklist_itens(categoria_id);
CREATE INDEX IF NOT EXISTS idx_vistorias_checklist_categorias_ordem ON vistorias_checklist_categorias(ordem);
CREATE INDEX IF NOT EXISTS idx_vistorias_checklist_itens_ordem ON vistorias_checklist_itens(categoria_id, ordem);

CREATE TABLE IF NOT EXISTS "laudo_vistoria_respostas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "laudo_id" uuid NOT NULL,
  "vistoria_id" uuid NOT NULL,
  "categoria_id" uuid NOT NULL REFERENCES vistorias_checklist_categorias(id) ON DELETE RESTRICT,
  "item_id" uuid NOT NULL REFERENCES vistorias_checklist_itens(id) ON DELETE RESTRICT,
  "resposta_conformidade" text, -- CONFORME | NAO_CONFORME | NA
  "resposta_texto" text,
  "resposta_numero" numeric(14,2),
  "resposta_opcoes" jsonb, -- array de valores selecionados
  "observacao" text,
  "foto_url" text,
  "respondido_em" timestamp with time zone DEFAULT now() NOT NULL,
  "respondido_por" uuid
);

CREATE INDEX IF NOT EXISTS idx_laudo_respostas_laudo ON laudo_vistoria_respostas(laudo_id);
CREATE INDEX IF NOT EXISTS idx_laudo_respostas_vistoria ON laudo_vistoria_respostas(vistoria_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_laudo_respostas_unq_laudo_item ON laudo_vistoria_respostas(laudo_id, item_id);

-- ==============================
-- SEED BÁSICO (etapas padrão do wizard atual)
-- ==============================
DO $$
DECLARE
  cat_id uuid;
  qtd_cat integer;
BEGIN
  SELECT COUNT(*) INTO qtd_cat FROM vistorias_checklist_categorias;
  IF qtd_cat = 0 THEN

    -- 1) Identificação
    INSERT INTO vistorias_checklist_categorias (nome, descricao, ordem) VALUES
      ('Identificação', 'Dados de identificação do veículo (KM, chassi, placa)', 1)
      RETURNING id INTO cat_id;
    INSERT INTO vistorias_checklist_itens (categoria_id, titulo, descricao_ajuda, tipo_item, obrigatorio, foto_obrigatoria, permite_observacao, ordem) VALUES
      (cat_id, 'Quilometragem', 'Registre a quilometragem atual exibida no painel', 'NUMERO', true, false, true, 1),
      (cat_id, 'Foto do Painel (KM)', 'Foto nítida do painel mostrando o KM', 'CONFORMIDADE', true, true, false, 2),
      (cat_id, 'Número do Chassi', 'Localize e digite o número do chassi', 'TEXTO_LIVRE', true, false, true, 3),
      (cat_id, 'Foto Chassi', 'Foto nítida do número gravado no chassi', 'CONFORMIDADE', true, true, false, 4),
      (cat_id, 'Placa', 'Verifique se a placa confere e está em bom estado', 'CONFORMIDADE', true, false, true, 5);

    -- 2) Estrutura
    INSERT INTO vistorias_checklist_categorias (nome, descricao, ordem) VALUES
      ('Estrutura', 'Estrutura, lataria, colunas, assoalho', 2)
      RETURNING id INTO cat_id;
    INSERT INTO vistorias_checklist_itens (categoria_id, titulo, descricao_ajuda, tipo_item, obrigatorio, foto_obrigatoria, permite_observacao, ordem) VALUES
      (cat_id, 'Coluna A', 'Verificar amassados, pintura, solda aparente', 'CONFORMIDADE', true, true, true, 1),
      (cat_id, 'Coluna B', 'Verificar amassados, pintura, solda aparente', 'CONFORMIDADE', true, true, true, 2),
      (cat_id, 'Coluna C', 'Verificar amassados, pintura, solda aparente', 'CONFORMIDADE', true, true, true, 3),
      (cat_id, 'Assoalho', 'Integridade do assoalho, caixa de roda', 'CONFORMIDADE', true, true, true, 4),
      (cat_id, 'Longarinas', 'Estrutura principal (longarinas dianteiras e traseiras)', 'CONFORMIDADE', true, true, true, 5),
      (cat_id, 'Teto', 'Amassados, pintura, vazamento', 'CONFORMIDADE', true, false, true, 6);

    -- 3) Exterior
    INSERT INTO vistorias_checklist_categorias (nome, descricao, ordem) VALUES
      ('Exterior', 'Lataria, pintura, vidros, para-choques, retrovisores', 3)
      RETURNING id INTO cat_id;
    INSERT INTO vistorias_checklist_itens (categoria_id, titulo, descricao_ajuda, tipo_item, obrigatorio, foto_obrigatoria, permite_observacao, ordem) VALUES
      (cat_id, 'Capô', 'Riscos, amassados, pintura', 'CONFORMIDADE', true, true, true, 1),
      (cat_id, 'Porta Dianteira Esq.', 'Verificar estado geral, maçaneta, vidro', 'CONFORMIDADE', true, true, true, 2),
      (cat_id, 'Porta Dianteira Dir.', 'Verificar estado geral, maçaneta, vidro', 'CONFORMIDADE', true, true, true, 3),
      (cat_id, 'Porta Traseira Esq.', 'Verificar estado geral, maçaneta, vidro', 'CONFORMIDADE', true, true, true, 4),
      (cat_id, 'Porta Traseira Dir.', 'Verificar estado geral, maçaneta, vidro', 'CONFORMIDADE', true, true, true, 5),
      (cat_id, 'Mala/Tampa Traseira', 'Vedações, amassados, fecho', 'CONFORMIDADE', true, true, true, 6),
      (cat_id, 'Para-choque Dianteiro', 'Amassados, arranhões, grade', 'CONFORMIDADE', true, false, true, 7),
      (cat_id, 'Para-choque Traseiro', 'Amassados, arranhões, luzes ré', 'CONFORMIDADE', true, false, true, 8),
      (cat_id, 'Vidros e Lanternas', 'Rachaduras, trincos, embaçados', 'CONFORMIDADE', true, true, true, 9);

    -- 4) Interior
    INSERT INTO vistorias_checklist_categorias (nome, descricao, ordem) VALUES
      ('Interior', 'Bancos, forração, painel, tetos, carpete', 4)
      RETURNING id INTO cat_id;
    INSERT INTO vistorias_checklist_itens (categoria_id, titulo, descricao_ajuda, tipo_item, obrigatorio, foto_obrigatoria, permite_observacao, ordem) VALUES
      (cat_id, 'Banco Motorista', 'Desgaste, rasgos, sujeira', 'CONFORMIDADE', true, true, true, 1),
      (cat_id, 'Banco Passageiro', 'Desgaste, rasgos, sujeira', 'CONFORMIDADE', true, true, true, 2),
      (cat_id, 'Bancos Traseiros', 'Estado geral, encostos, cintos', 'CONFORMIDADE', true, false, true, 3),
      (cat_id, 'Painel', 'Riscos, rachaduras, itens do painel', 'CONFORMIDADE', true, true, true, 4),
      (cat_id, 'Forração/Teto', 'Manchas, rasgos, soltos', 'CONFORMIDADE', true, false, true, 5),
      (cat_id, 'Carpete/Forro de porta', 'Desgaste, umidade, odores', 'CONFORMIDADE', true, false, true, 6),
      (cat_id, 'Odor geral', 'Cheiro de cigarro, mofo, combustível', 'CONFORMIDADE', true, false, true, 7);

    -- 5) Mecânica básica
    INSERT INTO vistorias_checklist_categorias (nome, descricao, ordem) VALUES
      ('Mecânica Básica', 'Motor, bateria, fluidos, funcionamento', 5)
      RETURNING id INTO cat_id;
    INSERT INTO vistorias_checklist_itens (categoria_id, titulo, descricao_ajuda, tipo_item, obrigatorio, foto_obrigatoria, permite_observacao, ordem) VALUES
      (cat_id, 'Partida do Motor', 'Barulhos estranhos, dificuldade no arranque', 'CONFORMIDADE', true, false, true, 1),
      (cat_id, 'Ruídos do Motor', 'Batidas de biela, tucho, sopros', 'CONFORMIDADE', true, false, true, 2),
      (cat_id, 'Fumaça no Escapamento', 'Cor anormal (azul, branca, preta)', 'CONFORMIDADE', true, true, true, 3),
      (cat_id, 'Nível de Óleo', 'Verificar vareta de óleo do motor', 'CONFORMIDADE', true, true, true, 4),
      (cat_id, 'Água do Radiador', 'Nível e integridade do reservatório', 'CONFORMIDADE', true, true, true, 5),
      (cat_id, 'Bateria', 'Estado geral, corrosão nos bornes', 'CONFORMIDADE', true, true, true, 6),
      (cat_id, 'Freios', 'Teste em baixa velocidade, ruídos', 'CONFORMIDADE', true, false, true, 7),
      (cat_id, 'Direção e Suspensão', 'Trepidação, folgas, ruídos', 'CONFORMIDADE', true, false, true, 8),
      (cat_id, 'Ar Condicionado', 'Refrigeração, ruídos no compressor', 'CONFORMIDADE', true, false, true, 9),
      (cat_id, 'Itens Elétricos (Luzes, Vidros, Travas)', 'Farol, seta, alerta, travas elétricas, vidros', 'CONFORMIDADE', true, false, true, 10);

    -- 6) Pneus e Rodas
    INSERT INTO vistorias_checklist_categorias (nome, descricao, ordem) VALUES
      ('Pneus e Rodas', 'Sulcos, desgaste, balanceamento, rodas', 6)
      RETURNING id INTO cat_id;
    INSERT INTO vistorias_checklist_itens (categoria_id, titulo, descricao_ajuda, tipo_item, obrigatorio, foto_obrigatoria, permite_observacao, ordem) VALUES
      (cat_id, 'Pneu Dianteiro Esq.', 'Profundidade do sulco, bolhas, cortes', 'CONFORMIDADE', true, true, true, 1),
      (cat_id, 'Pneu Dianteiro Dir.', 'Profundidade do sulco, bolhas, cortes', 'CONFORMIDADE', true, true, true, 2),
      (cat_id, 'Pneu Traseiro Esq.', 'Profundidade do sulco, bolhas, cortes', 'CONFORMIDADE', true, true, true, 3),
      (cat_id, 'Pneu Traseiro Dir.', 'Profundidade do sulco, bolhas, cortes', 'CONFORMIDADE', true, true, true, 4),
      (cat_id, 'Estepe', 'Existência e estado geral (calibragem)', 'CONFORMIDADE', true, true, true, 5),
      (cat_id, 'Rodas / Liga-leve', 'Amassados, arranhões, parafusos', 'CONFORMIDADE', true, true, true, 6);

    -- 7) Equipamentos e Acessórios
    INSERT INTO vistorias_checklist_categorias (nome, descricao, ordem) VALUES
      ('Equipamentos', 'Acessórios, multimídia, segurança, extras', 7)
      RETURNING id INTO cat_id;
    INSERT INTO vistorias_checklist_itens (categoria_id, titulo, descricao_ajuda, tipo_item, opcoes, obrigatorio, foto_obrigatoria, permite_observacao, ordem) VALUES
      (cat_id, 'Quais equipamentos estão presentes?', 'Marcar todos que existem no veículo', 'CHECKBOX_MULTIPLO',
        '[{"valor":"AIRBAG_DUPLOS","label":"Airbag duplo"},{"valor":"ABS","label":"Freios ABS"},{"valor":"AR_QUENTE","label":"Ar quente"},{"valor":"AR_CONDICIONADO","label":"Ar condicionado"},{"valor":"DIRECAO_HIDRAULICA","label":"Direção hidráulica"},{"valor":"DIRECAO_ELETRICA","label":"Direção elétrica"},{"valor":"TRAVA_ELETRICA","label":"Travas elétricas"},{"valor":"VIDROS_ELETRICOS","label":"Vidros elétricos"},{"valor":"MULTIMIDIA","label":"Multimídia / rádio"},{"valor":"CAMERA_RE","label":"Câmera de ré"},{"valor":"SENSOR_RE","label":"Sensor de ré"},{"valor":"RODAS_LIGA","label":"Rodas liga-leve"},{"valor":"TETO_SOLAR","label":"Teto solar"},{"valor":"BANCOS_COURO","label":"Bancos de couro"}]'::jsonb,
        true, false, true, 1),
      (cat_id, 'Chave Reserva', 'Possui segunda cópia da chave?', 'CONFORMIDADE', true, true, true, 2),
      (cat_id, 'Manual do Proprietário', 'Documentação do veículo', 'CONFORMIDADE', false, false, true, 3),
      (cat_id, 'Extintor', 'Prazo de validade e lacre', 'CONFORMIDADE', true, true, true, 4),
      (cat_id, 'Triângulo + Macaco', 'Itens de segurança obrigatórios', 'CONFORMIDADE', true, true, true, 5);

    -- 8) Documentos
    INSERT INTO vistorias_checklist_categorias (nome, descricao, ordem) VALUES
      ('Documentos', 'CRLV, documentos, multas, sinistro', 8)
      RETURNING id INTO cat_id;
    INSERT INTO vistorias_checklist_itens (categoria_id, titulo, descricao_ajuda, tipo_item, obrigatorio, foto_obrigatoria, permite_observacao, ordem) VALUES
      (cat_id, 'CRLV (Certificado Registro)', 'Documento do veículo válido', 'CONFORMIDADE', true, true, true, 1),
      (cat_id, 'Documento Pessoal Vendedor', 'RG/CNH válido do vendedor', 'CONFORMIDADE', true, true, true, 2),
      (cat_id, 'Multas Pendentes', 'Verificar se existem multas pendentes no sistema', 'CONFORMIDADE', true, false, true, 3),
      (cat_id, 'Restrições / Gravames', 'Financiamento, alienação, leilão anterior', 'CONFORMIDADE', true, false, true, 4),
      (cat_id, 'Sinistro / Roubo', 'Veículo já foi sinistrado ou recuperado?', 'CONFORMIDADE', true, false, true, 5);
  END IF;
END $$;
