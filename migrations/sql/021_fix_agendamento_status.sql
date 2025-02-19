-- Nome: 021_fix_agendamento_status
-- Descrição: Corrige os valores do enum status_agendamento
-- Data: 2024-03-18

-- Primeiro, vamos dropar o tipo enum existente e recriar com os valores corretos
DROP TYPE IF EXISTS status_agendamento CASCADE;

DO $$ BEGIN
    CREATE TYPE status_agendamento AS ENUM (
        'pendente',
        'confirmado',
        'concluido',
        'cancelado'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alterar a coluna status na tabela agendamentos para usar o novo enum
ALTER TABLE public.agendamentos
ALTER COLUMN status TYPE status_agendamento 
USING status::text::status_agendamento;

-- Adicionar um valor padrão para a coluna status
ALTER TABLE public.agendamentos
ALTER COLUMN status SET DEFAULT 'pendente'::status_agendamento; 