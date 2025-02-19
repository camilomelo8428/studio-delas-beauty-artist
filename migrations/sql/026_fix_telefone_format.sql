-- Nome: 026_fix_telefone_format
-- Descrição: Ajusta a validação do campo telefone para aceitar apenas números e formatação válida
-- Data: 2024-03-18

-- Função para limpar e formatar o telefone
CREATE OR REPLACE FUNCTION public.format_telefone(phone text)
RETURNS text AS $$
DECLARE
    cleaned_phone text;
    phone_length integer;
BEGIN
    -- Remove tudo que não é número
    cleaned_phone := regexp_replace(phone, '[^0-9]', '', 'g');
    phone_length := length(cleaned_phone);
    
    -- Verifica se tem a quantidade correta de números (10 para fixo ou 11 para celular)
    IF phone_length NOT IN (10, 11) THEN
        RAISE EXCEPTION 'Número de telefone deve ter 10 ou 11 dígitos';
    END IF;
    
    -- Formata o número
    RETURN '(' || substring(cleaned_phone from 1 for 2) || ') ' ||
           CASE 
               WHEN phone_length = 11 THEN
                   substring(cleaned_phone from 3 for 5) || '-' || substring(cleaned_phone from 8)
               ELSE
                   substring(cleaned_phone from 3 for 4) || '-' || substring(cleaned_phone from 7)
           END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Remover as constraints antigas
ALTER TABLE public.clientes
DROP CONSTRAINT IF EXISTS telefone_format;

ALTER TABLE public.funcionarios
DROP CONSTRAINT IF EXISTS telefone_format;

-- Adicionar trigger para formatar telefone antes de inserir/atualizar em clientes
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

-- Criar triggers para clientes
DROP TRIGGER IF EXISTS format_telefone_clientes ON public.clientes;
CREATE TRIGGER format_telefone_clientes
    BEFORE INSERT OR UPDATE ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_format_telefone();

-- Criar triggers para funcionarios
DROP TRIGGER IF EXISTS format_telefone_funcionarios ON public.funcionarios;
CREATE TRIGGER format_telefone_funcionarios
    BEFORE INSERT OR UPDATE ON public.funcionarios
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_format_telefone();

-- Adicionar novas constraints mais rigorosas
ALTER TABLE public.clientes
ADD CONSTRAINT telefone_format
CHECK (
    telefone ~ '^\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}$'  -- Formato: (99) 9999-9999 ou (99) 99999-9999
);

ALTER TABLE public.funcionarios
ADD CONSTRAINT telefone_format
CHECK (
    telefone ~ '^\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}$'  -- Formato: (99) 9999-9999 ou (99) 99999-9999
);

-- Atualizar telefones existentes para o novo formato
UPDATE public.clientes
SET telefone = public.format_telefone(telefone)
WHERE telefone IS NOT NULL;

UPDATE public.funcionarios
SET telefone = public.format_telefone(telefone)
WHERE telefone IS NOT NULL;

-- Comentários
COMMENT ON FUNCTION public.format_telefone IS 'Formata números de telefone para o padrão (99) 9999-9999 ou (99) 99999-9999';
COMMENT ON FUNCTION public.trigger_format_telefone IS 'Trigger para formatar automaticamente números de telefone';
COMMENT ON CONSTRAINT telefone_format ON public.clientes IS 'Valida o formato do telefone: (99) 9999-9999 ou (99) 99999-9999';
COMMENT ON CONSTRAINT telefone_format ON public.funcionarios IS 'Valida o formato do telefone: (99) 9999-9999 ou (99) 99999-9999'; 