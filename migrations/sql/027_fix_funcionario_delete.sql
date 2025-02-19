-- Nome: 027_fix_funcionario_delete
-- Descrição: Cria função para deletar funcionário com segurança
-- Data: 2024-03-18

-- Função para deletar um funcionário com segurança
CREATE OR REPLACE FUNCTION public.delete_funcionario_safe(funcionario_id UUID)
RETURNS void AS $$
DECLARE
    funcionario_photo_url TEXT;
BEGIN
    -- Obter URL da foto do funcionário antes de deletar
    SELECT foto_url INTO funcionario_photo_url
    FROM public.funcionarios
    WHERE id = funcionario_id;

    -- Cancelar todos os agendamentos futuros do funcionário
    UPDATE public.agendamentos
    SET status = 'cancelado'
    WHERE funcionario_id = funcionario_id 
    AND data > CURRENT_DATE
    AND status IN ('pendente', 'confirmado');

    -- Se o funcionário tiver foto, remover do storage
    IF funcionario_photo_url IS NOT NULL THEN
        DELETE FROM storage.objects
        WHERE bucket_id = 'funcionarios'
        AND name = split_part(funcionario_photo_url, 'funcionarios/', 2);
    END IF;

    -- Remover o funcionário
    DELETE FROM public.funcionarios
    WHERE id = funcionario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que apenas usuários autenticados podem chamar esta função
REVOKE ALL ON FUNCTION public.delete_funcionario_safe(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_funcionario_safe(UUID) TO authenticated;

-- Comentário na função
COMMENT ON FUNCTION public.delete_funcionario_safe IS 'Remove um funcionário com segurança, cancelando seus agendamentos futuros e removendo sua foto.'; 