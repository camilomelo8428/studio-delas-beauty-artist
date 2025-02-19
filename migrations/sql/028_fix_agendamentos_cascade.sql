-- Nome: 028_fix_agendamentos_cascade
-- Descrição: Adiciona ON DELETE CASCADE para funcionários na tabela de agendamentos
-- Data: 2024-03-18

-- Primeiro, remover a constraint existente
ALTER TABLE public.agendamentos
DROP CONSTRAINT IF EXISTS agendamentos_funcionario_id_fkey;

-- Adicionar a nova constraint com ON DELETE CASCADE
ALTER TABLE public.agendamentos
ADD CONSTRAINT agendamentos_funcionario_id_fkey
FOREIGN KEY (funcionario_id)
REFERENCES public.funcionarios(id)
ON DELETE CASCADE;

-- Atualizar a função de exclusão segura para não precisar cancelar agendamentos
CREATE OR REPLACE FUNCTION public.delete_funcionario_safe(funcionario_id UUID)
RETURNS void AS $$
DECLARE
    funcionario_photo_url TEXT;
BEGIN
    -- Obter URL da foto do funcionário antes de deletar
    SELECT foto_url INTO funcionario_photo_url
    FROM public.funcionarios
    WHERE id = funcionario_id;

    -- Se o funcionário tiver foto, remover do storage
    IF funcionario_photo_url IS NOT NULL THEN
        DELETE FROM storage.objects
        WHERE bucket_id = 'funcionarios'
        AND name = split_part(funcionario_photo_url, 'funcionarios/', 2);
    END IF;

    -- Remover o funcionário (os agendamentos serão removidos automaticamente pelo CASCADE)
    DELETE FROM public.funcionarios
    WHERE id = funcionario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 