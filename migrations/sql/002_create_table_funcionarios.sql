-- Nome: 002_create_table_funcionarios
-- Descrição: Cria a tabela de funcionários (barbeiros) e configura as políticas de segurança
-- Data: 2024-02-15

-- Criação da tabela de funcionários
CREATE TABLE IF NOT EXISTS public.funcionarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(15) NOT NULL,
    foto_url TEXT,
    status BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT telefone_format CHECK (telefone ~ '^\([0-9]{2}\) [0-9]{5}-[0-9]{4}$')
);

-- Criação dos índices
CREATE INDEX IF NOT EXISTS idx_funcionarios_nome ON public.funcionarios(nome);
CREATE INDEX IF NOT EXISTS idx_funcionarios_status ON public.funcionarios(status);

-- Trigger para atualizar o updated_at
DROP TRIGGER IF EXISTS set_funcionarios_updated_at ON public.funcionarios;
CREATE TRIGGER set_funcionarios_updated_at
    BEFORE UPDATE ON public.funcionarios
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Configuração de segurança (RLS)
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

-- Política para permitir select para todos
CREATE POLICY "Permitir select para todos" ON public.funcionarios
    FOR SELECT USING (true);

-- Política para permitir insert/update/delete apenas para administradores
CREATE POLICY "Permitir gerenciamento apenas para administradores" ON public.funcionarios
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE raw_user_meta_data->>'role' = 'admin'
    ));

-- Comentários nas colunas
COMMENT ON TABLE public.funcionarios IS 'Tabela que armazena informações dos funcionários (barbeiros)';
COMMENT ON COLUMN public.funcionarios.id IS 'ID único do funcionário';
COMMENT ON COLUMN public.funcionarios.nome IS 'Nome completo do funcionário';
COMMENT ON COLUMN public.funcionarios.telefone IS 'Telefone do funcionário no formato (99) 99999-9999';
COMMENT ON COLUMN public.funcionarios.foto_url IS 'URL da foto do funcionário no storage';
COMMENT ON COLUMN public.funcionarios.status IS 'Status do funcionário (true = ativo, false = inativo)';
COMMENT ON COLUMN public.funcionarios.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN public.funcionarios.updated_at IS 'Data e hora da última atualização do registro'; 