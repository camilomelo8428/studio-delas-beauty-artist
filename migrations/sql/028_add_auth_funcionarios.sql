-- Nome: 028_add_auth_funcionarios
-- Descrição: Adiciona campos de autenticação na tabela de funcionários
-- Data: 2024-03-20

-- Habilitar a extensão pgcrypto se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Remover constraints existentes se houver
ALTER TABLE public.funcionarios
DROP CONSTRAINT IF EXISTS funcionarios_email_check;

-- Adiciona campos de autenticação
ALTER TABLE public.funcionarios
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS senha_hash TEXT;

-- Criar índice para busca por email
CREATE INDEX IF NOT EXISTS idx_funcionarios_email ON public.funcionarios(email);

-- Adicionar constraint de unicidade apenas para emails não nulos
CREATE UNIQUE INDEX IF NOT EXISTS idx_funcionarios_email_unique 
ON public.funcionarios(email) 
WHERE email IS NOT NULL;

-- Adicionar validação de formato de email
ALTER TABLE public.funcionarios
ADD CONSTRAINT funcionarios_email_check 
CHECK (
    email IS NULL OR 
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

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

-- Garantir que apenas usuários autenticados podem executar as funções
REVOKE ALL ON FUNCTION public.criar_login_funcionario(UUID, VARCHAR, TEXT) FROM public;
REVOKE ALL ON FUNCTION public.autenticar_funcionario(VARCHAR, TEXT) FROM public;

GRANT EXECUTE ON FUNCTION public.criar_login_funcionario(UUID, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.autenticar_funcionario(VARCHAR, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.autenticar_funcionario(VARCHAR, TEXT) TO authenticated;

-- Comentários
COMMENT ON COLUMN public.funcionarios.email IS 'Email do funcionário para login';
COMMENT ON COLUMN public.funcionarios.senha_hash IS 'Hash da senha do funcionário usando bcrypt';
COMMENT ON FUNCTION public.criar_login_funcionario IS 'Cria ou atualiza as credenciais de login de um funcionário';
COMMENT ON FUNCTION public.autenticar_funcionario IS 'Autentica um funcionário usando email e senha';

-- Atualizar as interfaces NovoFuncionario e AtualizarFuncionario
ALTER TABLE public.funcionarios
ALTER COLUMN email SET NOT NULL,
ADD CONSTRAINT funcionarios_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Adicionar trigger para validar email antes de inserir/atualizar
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

CREATE TRIGGER trigger_validar_email_funcionario
    BEFORE INSERT OR UPDATE ON public.funcionarios
    FOR EACH ROW
    EXECUTE FUNCTION public.validar_email_funcionario(); 