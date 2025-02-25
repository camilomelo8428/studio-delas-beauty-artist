-- Nome: setup_completo.sql
-- Descrição: Script completo para configuração inicial do banco de dados
-- Data: 2024-03-20
-- Desenvolvido por: Camilo Melo

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criação dos tipos ENUM
DO $$ BEGIN
    -- Enum para categoria de serviço
    CREATE TYPE categoria_servico AS ENUM ('barbearia', 'salao');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Enum para função do funcionário
    CREATE TYPE funcao_funcionario AS ENUM ('barbeiro', 'cabeleireiro', 'manicure', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Enum para status do agendamento
    CREATE TYPE status_agendamento AS ENUM ('pendente', 'confirmado', 'concluido', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Enum para categoria de produto
    CREATE TYPE categoria_produto AS ENUM ('cabelo', 'barba', 'skincare', 'perfumaria', 'acessorios');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criação das tabelas
-- Tabela de clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefone TEXT NOT NULL,
    data_nascimento DATE,
    genero TEXT,
    cpf TEXT UNIQUE,
    endereco TEXT,
    bairro TEXT,
    cidade TEXT,
    estado CHAR(2),
    cep TEXT,
    foto_url TEXT,
    observacoes TEXT,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT telefone_format CHECK (telefone ~ '^\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}$')
);

-- Tabela de funcionários
CREATE TABLE IF NOT EXISTS public.funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefone TEXT NOT NULL,
    foto_url TEXT,
    funcao funcao_funcionario NOT NULL DEFAULT 'barbeiro',
    senha_hash TEXT,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT telefone_format CHECK (telefone ~ '^\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}$'),
    CONSTRAINT funcionarios_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Tabela de serviços
CREATE TABLE IF NOT EXISTS public.servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) NOT NULL,
    duracao_minutos INTEGER NOT NULL,
    foto_url TEXT,
    categoria categoria_servico NOT NULL DEFAULT 'barbearia',
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de horários
CREATE TABLE IF NOT EXISTS public.horarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dia_semana INTEGER,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    tipo_horario VARCHAR(20) NOT NULL DEFAULT 'semanal' CHECK (tipo_horario IN ('semanal', 'especifico')),
    data_especifica DATE,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT check_data_especifica CHECK (
        (tipo_horario = 'semanal' AND data_especifica IS NULL AND dia_semana IS NOT NULL) OR
        (tipo_horario = 'especifico' AND data_especifica IS NOT NULL AND dia_semana IS NULL)
    )
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id),
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    servico_id UUID NOT NULL REFERENCES public.servicos(id),
    data DATE NOT NULL,
    horario TIME NOT NULL,
    status status_agendamento DEFAULT 'pendente' NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) NOT NULL,
    preco_promocional DECIMAL(10,2),
    estoque INTEGER NOT NULL DEFAULT 0,
    categoria categoria_produto NOT NULL,
    marca TEXT,
    destaque BOOLEAN DEFAULT false,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de imagens de produtos
CREATE TABLE IF NOT EXISTS public.produto_imagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    principal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de configurações
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_empresa TEXT NOT NULL,
    logo_url TEXT,
    telefone TEXT NOT NULL,
    email TEXT NOT NULL,
    endereco TEXT NOT NULL,
    bairro TEXT NOT NULL,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    cep TEXT NOT NULL,
    horario_funcionamento TEXT NOT NULL,
    instagram TEXT,
    facebook TEXT,
    whatsapp TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON public.clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON public.clientes(status);

CREATE INDEX IF NOT EXISTS idx_funcionarios_email ON public.funcionarios(email);
CREATE INDEX IF NOT EXISTS idx_funcionarios_funcao ON public.funcionarios(funcao);
CREATE INDEX IF NOT EXISTS idx_funcionarios_status ON public.funcionarios(status);

CREATE INDEX IF NOT EXISTS idx_servicos_categoria ON public.servicos(categoria);
CREATE INDEX IF NOT EXISTS idx_servicos_status ON public.servicos(status);

CREATE INDEX IF NOT EXISTS idx_horarios_dia_semana ON public.horarios(dia_semana);
CREATE INDEX IF NOT EXISTS idx_horarios_data_especifica ON public.horarios(data_especifica);
CREATE INDEX IF NOT EXISTS idx_horarios_status ON public.horarios(status);

CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON public.agendamentos(data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_horario ON public.agendamentos(horario);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON public.agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON public.agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_funcionario ON public.agendamentos(funcionario_id);

CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_destaque ON public.produtos(destaque) WHERE destaque = true;
CREATE INDEX IF NOT EXISTS idx_produtos_status ON public.produtos(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_produto_imagens_principal_unique 
ON public.produto_imagens (produto_id) 
WHERE principal = true;

-- Triggers
CREATE TRIGGER set_clientes_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_funcionarios_updated_at
    BEFORE UPDATE ON public.funcionarios
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_servicos_updated_at
    BEFORE UPDATE ON public.servicos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_horarios_updated_at
    BEFORE UPDATE ON public.horarios
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_agendamentos_updated_at
    BEFORE UPDATE ON public.agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_produtos_updated_at
    BEFORE UPDATE ON public.produtos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_produto_imagens_updated_at
    BEFORE UPDATE ON public.produto_imagens
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Funções
-- Função para formatar telefone
CREATE OR REPLACE FUNCTION public.format_telefone(phone text)
RETURNS text AS $$
DECLARE
    cleaned_phone text;
    phone_length integer;
BEGIN
    cleaned_phone := regexp_replace(phone, '[^0-9]', '', 'g');
    phone_length := length(cleaned_phone);
    
    IF phone_length NOT IN (10, 11) THEN
        RAISE EXCEPTION 'Número de telefone deve ter 10 ou 11 dígitos';
    END IF;
    
    RETURN '(' || substring(cleaned_phone from 1 for 2) || ') ' ||
           CASE 
               WHEN phone_length = 11 THEN
                   substring(cleaned_phone from 3 for 5) || '-' || substring(cleaned_phone from 8)
               ELSE
                   substring(cleaned_phone from 3 for 4) || '-' || substring(cleaned_phone from 7)
           END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para formatar telefone
CREATE OR REPLACE FUNCTION public.trigger_format_telefone()
RETURNS trigger AS $$
BEGIN
    NEW.telefone := public.format_telefone(NEW.telefone);
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Telefone inválido. Use apenas números (10 ou 11 dígitos)';
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de formatação de telefone
CREATE TRIGGER format_telefone_clientes
    BEFORE INSERT OR UPDATE ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_format_telefone();

CREATE TRIGGER format_telefone_funcionarios
    BEFORE INSERT OR UPDATE ON public.funcionarios
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_format_telefone();

-- Função para validar horário de agendamento
CREATE OR REPLACE FUNCTION public.validar_horario_agendamento()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.horarios h
        WHERE 
            (h.tipo_horario = 'semanal' AND h.dia_semana = EXTRACT(DOW FROM NEW.data)::integer) OR
            (h.tipo_horario = 'especifico' AND h.data_especifica = NEW.data)
    ) THEN
        RAISE EXCEPTION 'Não há horário de funcionamento disponível nesta data';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.horarios h
        WHERE 
            ((h.tipo_horario = 'semanal' AND h.dia_semana = EXTRACT(DOW FROM NEW.data)::integer) OR
             (h.tipo_horario = 'especifico' AND h.data_especifica = NEW.data)) AND
            NEW.horario >= h.hora_inicio AND
            NEW.horario <= h.hora_fim
    ) THEN
        RAISE EXCEPTION 'Horário fora do período de funcionamento';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.agendamentos a
        WHERE 
            a.funcionario_id = NEW.funcionario_id AND
            a.data = NEW.data AND
            a.horario = NEW.horario AND
            a.id != NEW.id AND
            a.status != 'cancelado'
    ) THEN
        RAISE EXCEPTION 'Já existe um agendamento para este horário';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de validação de horário
CREATE TRIGGER trigger_validar_horario_agendamento
    BEFORE INSERT OR UPDATE ON public.agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.validar_horario_agendamento();

-- Função para deletar funcionário com segurança
CREATE OR REPLACE FUNCTION public.delete_funcionario_safe(funcionario_id UUID)
RETURNS void AS $$
DECLARE
    funcionario_photo_url TEXT;
BEGIN
    SELECT foto_url INTO funcionario_photo_url
    FROM public.funcionarios
    WHERE id = funcionario_id;

    IF funcionario_photo_url IS NOT NULL THEN
        DELETE FROM storage.objects
        WHERE bucket_id = 'funcionarios'
        AND name = split_part(funcionario_photo_url, 'funcionarios/', 2);
    END IF;

    DELETE FROM public.funcionarios
    WHERE id = funcionario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para deletar usuário completamente
CREATE OR REPLACE FUNCTION public.delete_user_complete(user_id UUID)
RETURNS void AS $$
DECLARE
    user_photo_url TEXT;
BEGIN
    SELECT foto_url INTO user_photo_url
    FROM public.clientes
    WHERE id = user_id;

    UPDATE public.agendamentos
    SET status = 'cancelado'
    WHERE cliente_id = user_id 
    AND status IN ('pendente', 'confirmado');

    DELETE FROM public.agendamentos
    WHERE cliente_id = user_id;

    IF user_photo_url IS NOT NULL THEN
        DELETE FROM storage.objects
        WHERE bucket_id = 'clientes'
        AND name = split_part(user_photo_url, 'clientes/', 2);
    END IF;

    DELETE FROM public.clientes
    WHERE id = user_id;

    DELETE FROM auth.users
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Configurar buckets do storage
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('clientes', 'clientes', true),
    ('funcionarios', 'funcionarios', true),
    ('servicos', 'servicos', true),
    ('produtos', 'produtos', true),
    ('configuracoes', 'configuracoes', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Configurar RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_imagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Garantir permissões
GRANT ALL ON public.clientes TO authenticated;
GRANT ALL ON public.funcionarios TO authenticated;
GRANT ALL ON public.servicos TO authenticated;
GRANT ALL ON public.horarios TO authenticated;
GRANT ALL ON public.agendamentos TO authenticated;
GRANT ALL ON public.produtos TO authenticated;
GRANT ALL ON public.produto_imagens TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Políticas de acesso
-- Políticas para storage
CREATE POLICY "Acesso público ao storage"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('clientes', 'funcionarios', 'servicos', 'produtos', 'configuracoes'));

CREATE POLICY "Gerenciamento de arquivos por autenticados"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id IN ('clientes', 'funcionarios', 'servicos', 'produtos', 'configuracoes'))
WITH CHECK (bucket_id IN ('clientes', 'funcionarios', 'servicos', 'produtos', 'configuracoes'));

-- Configuração inicial
INSERT INTO public.configuracoes (
    nome_empresa,
    logo_url,
    telefone,
    email,
    endereco,
    bairro,
    cidade,
    estado,
    cep,
    horario_funcionamento,
    instagram,
    facebook,
    whatsapp
) VALUES (
    'CamiloTec',
    null,
    '(91) 98184-5943',
    'contato@camilotec.com.br',
    'Av. Principal, 1234',
    'Centro',
    'Belém',
    'PA',
    '66000-000',
    'Seg à Sex: 09h - 20h | Sáb: 09h - 18h | Dom: Fechado',
    '@camilotec',
    '/camilotec',
    '(91) 98184-5943'
) ON CONFLICT (id) DO NOTHING;

-- Função para criar login de funcionário
CREATE OR REPLACE FUNCTION public.criar_login_funcionario(
    p_funcionario_id UUID,
    p_email VARCHAR,
    p_senha TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Verifica se o funcionário existe
    IF NOT EXISTS (SELECT 1 FROM public.funcionarios WHERE id = p_funcionario_id) THEN
        RAISE EXCEPTION 'Funcionário não encontrado';
    END IF;

    -- Verifica se o email já está em uso por outro funcionário
    IF EXISTS (
        SELECT 1 
        FROM public.funcionarios 
        WHERE email = p_email 
        AND id != p_funcionario_id
        AND email IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Este email já está em uso por outro funcionário';
    END IF;

    -- Atualiza o email e senha do funcionário
    UPDATE public.funcionarios
    SET 
        email = p_email,
        senha_hash = crypt(p_senha, gen_salt('bf'))
    WHERE id = p_funcionario_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para autenticar funcionário
CREATE OR REPLACE FUNCTION public.autenticar_funcionario(
    p_email VARCHAR,
    p_senha TEXT
) RETURNS TABLE (
    id UUID,
    nome VARCHAR,
    email VARCHAR,
    funcao funcao_funcionario,
    status BOOLEAN,
    foto_url TEXT,
    telefone VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.nome,
        f.email,
        f.funcao,
        f.status,
        f.foto_url,
        f.telefone
    FROM public.funcionarios f
    WHERE 
        f.email = p_email 
        AND f.senha_hash = crypt(p_senha, f.senha_hash)
        AND f.status = true;

    -- Se nenhum registro for encontrado
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Email ou senha incorretos';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para validar email do funcionário
CREATE OR REPLACE FUNCTION public.validar_email_funcionario()
RETURNS TRIGGER AS $$
BEGIN
    -- Verifica se o email está no formato correto
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Email inválido';
    END IF;

    -- Verifica se o email já está em uso
    IF EXISTS (
        SELECT 1 
        FROM public.funcionarios 
        WHERE email = NEW.email 
        AND id != NEW.id
    ) THEN
        RAISE EXCEPTION 'Este email já está em uso';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar email do funcionário
CREATE TRIGGER trigger_validar_email_funcionario
    BEFORE INSERT OR UPDATE ON public.funcionarios
    FOR EACH ROW
    EXECUTE FUNCTION public.validar_email_funcionario();

-- Permissões das funções
REVOKE ALL ON FUNCTION public.criar_login_funcionario(UUID, VARCHAR, TEXT) FROM public;
REVOKE ALL ON FUNCTION public.autenticar_funcionario(VARCHAR, TEXT) FROM public;

GRANT EXECUTE ON FUNCTION public.criar_login_funcionario(UUID, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.autenticar_funcionario(VARCHAR, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.autenticar_funcionario(VARCHAR, TEXT) TO authenticated;

-- Comentários adicionais
COMMENT ON COLUMN public.funcionarios.email IS 'Email do funcionário para login';
COMMENT ON COLUMN public.funcionarios.senha_hash IS 'Hash da senha do funcionário usando bcrypt';
COMMENT ON FUNCTION public.criar_login_funcionario IS 'Cria ou atualiza as credenciais de login de um funcionário';
COMMENT ON FUNCTION public.autenticar_funcionario IS 'Autentica um funcionário usando email e senha, retornando informações adicionais como foto e telefone'; 