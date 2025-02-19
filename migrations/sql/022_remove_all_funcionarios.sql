-- Nome: 022_remove_all_funcionarios
-- Descrição: Remove todos os funcionários do sistema
-- Data: 2024-03-18

-- Primeiro, remover todos os agendamentos
DELETE FROM public.agendamentos;

-- Remover imagens dos funcionários do storage
DO $$ 
DECLARE
    funcionario_record RECORD;
BEGIN
    -- Iterar sobre funcionários com foto_url
    FOR funcionario_record IN 
        SELECT id, foto_url 
        FROM public.funcionarios 
        WHERE foto_url IS NOT NULL
    LOOP
        -- Remover o arquivo do storage
        DELETE FROM storage.objects
        WHERE bucket_id = 'funcionarios'
        AND name = split_part(funcionario_record.foto_url, 'funcionarios/', 2);
    END LOOP;
END $$;

-- Remover todos os funcionários
DELETE FROM public.funcionarios;

-- Resetar a sequência do ID (se existir)
ALTER SEQUENCE IF EXISTS public.funcionarios_id_seq RESTART WITH 1; 