-- Nome: 029_update_funcionario_auth
-- Descrição: Atualiza a função de autenticação de funcionários para retornar campos adicionais
-- Data: 2024-03-20

-- Remover a função existente
DROP FUNCTION IF EXISTS public.autenticar_funcionario(VARCHAR, TEXT);

-- Atualizar a função de autenticação
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

-- Garantir que apenas usuários autenticados podem executar a função
REVOKE ALL ON FUNCTION public.autenticar_funcionario(VARCHAR, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.autenticar_funcionario(VARCHAR, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.autenticar_funcionario(VARCHAR, TEXT) TO authenticated;

-- Comentário na função
COMMENT ON FUNCTION public.autenticar_funcionario IS 'Autentica um funcionário usando email e senha, retornando informações adicionais como foto e telefone'; 