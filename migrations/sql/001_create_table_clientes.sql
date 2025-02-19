-- Nome: 001_create_table_clientes
-- Descrição: Cria a tabela de clientes e configura as políticas de segurança
-- Data: 2024-02-15

-- Habilita a extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criação da tabela de clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(15) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT telefone_format CHECK (telefone ~ '^\([0-9]{2}\) [0-9]{5}-[0-9]{4}$')
);

-- Criação do índice para busca por telefone
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON public.clientes(telefone);

-- Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar o updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.clientes;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Configuração de segurança (RLS)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Política para permitir select para todos os usuários autenticados
CREATE POLICY "Permitir select para usuários autenticados" ON public.clientes
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir insert apenas para o próprio usuário
CREATE POLICY "Permitir insert apenas para próprio usuário" ON public.clientes
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Política para permitir update apenas para o próprio usuário
CREATE POLICY "Permitir update apenas para próprio usuário" ON public.clientes
    FOR UPDATE USING (auth.uid() = id);

-- Comentários nas colunas
COMMENT ON TABLE public.clientes IS 'Tabela que armazena informações dos clientes da barbearia';
COMMENT ON COLUMN public.clientes.id IS 'ID do cliente (mesmo ID do auth.users)';
COMMENT ON COLUMN public.clientes.nome IS 'Nome completo do cliente';
COMMENT ON COLUMN public.clientes.telefone IS 'Telefone do cliente no formato (99) 99999-9999';
COMMENT ON COLUMN public.clientes.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN public.clientes.updated_at IS 'Data e hora da última atualização do registro'; 