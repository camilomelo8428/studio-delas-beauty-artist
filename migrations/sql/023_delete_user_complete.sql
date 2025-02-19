-- Nome: 023_delete_user_complete
-- Descrição: Remove completamente um usuário do sistema, incluindo autenticação
-- Data: 2024-03-18

-- Função para deletar um usuário completamente
CREATE OR REPLACE FUNCTION public.delete_user_complete(user_id UUID)
RETURNS void AS $$
DECLARE
    user_photo_url TEXT;
BEGIN
    -- Obter URL da foto do usuário antes de deletar
    SELECT foto_url INTO user_photo_url
    FROM public.clientes
    WHERE id = user_id;

    -- Cancelar todos os agendamentos pendentes ou confirmados do usuário
    UPDATE public.agendamentos
    SET status = 'cancelado'
    WHERE cliente_id = user_id 
    AND status IN ('pendente', 'confirmado');

    -- Remover todos os agendamentos do usuário
    DELETE FROM public.agendamentos
    WHERE cliente_id = user_id;

    -- Se o usuário tiver foto, remover do storage
    IF user_photo_url IS NOT NULL THEN
        DELETE FROM storage.objects
        WHERE bucket_id = 'clientes'
        AND name = split_part(user_photo_url, 'clientes/', 2);
    END IF;

    -- Remover o usuário da tabela de clientes
    DELETE FROM public.clientes
    WHERE id = user_id;

    -- Remover a conta de autenticação
    DELETE FROM auth.users
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que apenas usuários autenticados podem chamar esta função
REVOKE ALL ON FUNCTION public.delete_user_complete(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_user_complete(UUID) TO authenticated;

-- Criar política para permitir que apenas admins possam executar
CREATE POLICY "Apenas admins podem deletar usuários completamente"
    ON auth.users
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT id 
            FROM auth.users 
            WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Comentário na função
COMMENT ON FUNCTION public.delete_user_complete IS 'Remove completamente um usuário do sistema, incluindo sua conta de autenticação, agendamentos e foto.'; 