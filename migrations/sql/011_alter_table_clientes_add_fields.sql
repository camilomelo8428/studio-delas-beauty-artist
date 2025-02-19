-- Nome: 011_alter_table_clientes_add_fields
-- Descrição: Adiciona campos adicionais à tabela de clientes
-- Data: 2024-02-17

-- Adiciona novas colunas
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS data_nascimento DATE,
ADD COLUMN IF NOT EXISTS genero VARCHAR(20),
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
ADD COLUMN IF NOT EXISTS endereco TEXT,
ADD COLUMN IF NOT EXISTS bairro VARCHAR(100),
ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
ADD COLUMN IF NOT EXISTS estado CHAR(2),
ADD COLUMN IF NOT EXISTS cep VARCHAR(9),
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Comentários nas novas colunas
COMMENT ON COLUMN public.clientes.data_nascimento IS 'Data de nascimento do cliente';
COMMENT ON COLUMN public.clientes.genero IS 'Gênero do cliente';
COMMENT ON COLUMN public.clientes.cpf IS 'CPF do cliente';
COMMENT ON COLUMN public.clientes.endereco IS 'Endereço completo do cliente';
COMMENT ON COLUMN public.clientes.bairro IS 'Bairro do cliente';
COMMENT ON COLUMN public.clientes.cidade IS 'Cidade do cliente';
COMMENT ON COLUMN public.clientes.estado IS 'Estado (UF) do cliente';
COMMENT ON COLUMN public.clientes.cep IS 'CEP do cliente';
COMMENT ON COLUMN public.clientes.foto_url IS 'URL da foto do perfil do cliente';
COMMENT ON COLUMN public.clientes.observacoes IS 'Observações gerais sobre o cliente'; 