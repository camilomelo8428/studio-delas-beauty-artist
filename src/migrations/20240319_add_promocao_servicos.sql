-- Adiciona campos para promoções na tabela servicos
ALTER TABLE servicos 
ADD COLUMN IF NOT EXISTS preco_promocional numeric,
ADD COLUMN IF NOT EXISTS promocao_ativa boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS promocao_inicio timestamp with time zone,
ADD COLUMN IF NOT EXISTS promocao_fim timestamp with time zone,
ADD COLUMN IF NOT EXISTS promocao_descricao text; 