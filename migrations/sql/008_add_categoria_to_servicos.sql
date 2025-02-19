-- Nome: 008_add_categoria_to_servicos
-- Descrição: Adiciona a coluna categoria à tabela de serviços
-- Data: 2024-02-15

-- Criação do tipo enum para categoria
DO $$ BEGIN
    CREATE TYPE categoria_servico AS ENUM ('barbearia', 'salao');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adiciona a coluna categoria
ALTER TABLE public.servicos
ADD COLUMN IF NOT EXISTS categoria categoria_servico DEFAULT 'barbearia' NOT NULL;

-- Criação do índice
CREATE INDEX IF NOT EXISTS idx_servicos_categoria ON public.servicos(categoria);

-- Comentário na coluna
COMMENT ON COLUMN public.servicos.categoria IS 'Categoria do serviço (barbearia ou salão)'; 