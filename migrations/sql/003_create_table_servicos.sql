-- Nome: 003_create_table_servicos
-- Descrição: Cria a tabela de serviços oferecidos pela barbearia
-- Data: 2024-02-15

-- Criação da tabela de serviços
CREATE TABLE IF NOT EXISTS public.servicos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) NOT NULL,
    duracao_minutos INTEGER NOT NULL,
    foto_url TEXT,
    status BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT preco_positivo CHECK (preco > 0),
    CONSTRAINT duracao_positiva CHECK (duracao_minutos > 0)
);

-- Criação dos índices
CREATE INDEX IF NOT EXISTS idx_servicos_nome ON public.servicos(nome);
CREATE INDEX IF NOT EXISTS idx_servicos_status ON public.servicos(status);
CREATE INDEX IF NOT EXISTS idx_servicos_preco ON public.servicos(preco);

-- Trigger para atualizar o updated_at
DROP TRIGGER IF EXISTS set_servicos_updated_at ON public.servicos;
CREATE TRIGGER set_servicos_updated_at
    BEFORE UPDATE ON public.servicos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Configuração de segurança (RLS)
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

-- Política para permitir select para todos
CREATE POLICY "Permitir select para todos" ON public.servicos
    FOR SELECT USING (true);

-- Política para permitir insert/update/delete apenas para administradores
CREATE POLICY "Permitir gerenciamento apenas para administradores" ON public.servicos
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE raw_user_meta_data->>'role' = 'admin'
    ));

-- Comentários nas colunas
COMMENT ON TABLE public.servicos IS 'Tabela que armazena os serviços oferecidos pela barbearia';
COMMENT ON COLUMN public.servicos.id IS 'ID único do serviço';
COMMENT ON COLUMN public.servicos.nome IS 'Nome do serviço';
COMMENT ON COLUMN public.servicos.descricao IS 'Descrição detalhada do serviço';
COMMENT ON COLUMN public.servicos.preco IS 'Preço do serviço em reais';
COMMENT ON COLUMN public.servicos.duracao_minutos IS 'Duração estimada do serviço em minutos';
COMMENT ON COLUMN public.servicos.foto_url IS 'URL da foto ilustrativa do serviço';
COMMENT ON COLUMN public.servicos.status IS 'Status do serviço (true = ativo, false = inativo)';
COMMENT ON COLUMN public.servicos.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN public.servicos.updated_at IS 'Data e hora da última atualização do registro'; 