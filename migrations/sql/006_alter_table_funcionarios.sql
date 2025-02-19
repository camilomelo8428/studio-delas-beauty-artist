-- Nome: 006_alter_table_funcionarios
-- Descrição: Adiciona o campo email na tabela de funcionários
-- Data: 2024-02-15

-- Adiciona a coluna email
ALTER TABLE public.funcionarios
ADD COLUMN IF NOT EXISTS email VARCHAR(255) NOT NULL UNIQUE;

-- Adiciona índice para busca por email
CREATE INDEX IF NOT EXISTS idx_funcionarios_email ON public.funcionarios(email);

-- Adiciona comentário na coluna
COMMENT ON COLUMN public.funcionarios.email IS 'Email do funcionário (único)'; 