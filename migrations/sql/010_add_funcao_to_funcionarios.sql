-- Nome: 010_add_funcao_to_funcionarios
-- Descrição: Adiciona o campo função à tabela de funcionários
-- Data: 2024-02-17

-- Criação do tipo enum para função
DO $$ BEGIN
    CREATE TYPE funcao_funcionario AS ENUM ('barbeiro', 'cabeleireiro', 'manicure', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adiciona a coluna função
ALTER TABLE public.funcionarios
ADD COLUMN IF NOT EXISTS funcao funcao_funcionario DEFAULT 'barbeiro' NOT NULL;

-- Criação do índice
CREATE INDEX IF NOT EXISTS idx_funcionarios_funcao ON public.funcionarios(funcao);

-- Comentário na coluna
COMMENT ON COLUMN public.funcionarios.funcao IS 'Função do funcionário (barbeiro, cabeleireiro, manicure, admin)'; 