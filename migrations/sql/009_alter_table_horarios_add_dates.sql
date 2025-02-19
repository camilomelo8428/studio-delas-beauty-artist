-- Nome: 009_alter_table_horarios_add_dates
-- Descrição: Adiciona suporte a datas específicas na tabela de horários
-- Data: 2024-02-17

-- Remove a constraint existente se ela existir
ALTER TABLE public.horarios
DROP CONSTRAINT IF EXISTS check_data_especifica;

-- Permite valores nulos no campo dia_semana
ALTER TABLE public.horarios
ALTER COLUMN dia_semana DROP NOT NULL;

-- Adiciona novas colunas para datas específicas
ALTER TABLE public.horarios
ADD COLUMN IF NOT EXISTS data_especifica DATE,
ADD COLUMN IF NOT EXISTS tipo_horario VARCHAR(20) NOT NULL DEFAULT 'semanal' CHECK (tipo_horario IN ('semanal', 'especifico'));

-- Adiciona índice para data_especifica
CREATE INDEX IF NOT EXISTS idx_horarios_data_especifica ON public.horarios(data_especifica);

-- Adiciona constraint para garantir que horários específicos tenham data
ALTER TABLE public.horarios
ADD CONSTRAINT check_data_especifica 
CHECK (
    (tipo_horario = 'semanal' AND data_especifica IS NULL AND dia_semana IS NOT NULL) OR
    (tipo_horario = 'especifico' AND data_especifica IS NOT NULL AND dia_semana IS NULL)
);

-- Comentários nas novas colunas
COMMENT ON COLUMN public.horarios.data_especifica IS 'Data específica para o horário de funcionamento (NULL para horários semanais)';
COMMENT ON COLUMN public.horarios.tipo_horario IS 'Tipo do horário: semanal ou específico';

-- Atualiza os registros existentes para tipo_horario = 'semanal'
UPDATE public.horarios SET tipo_horario = 'semanal' WHERE tipo_horario IS NULL; 