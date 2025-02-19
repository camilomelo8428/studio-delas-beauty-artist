-- Nome: 005_create_table_horarios
-- Descrição: Cria a tabela de horários de funcionamento
-- Data: 2024-02-15

-- Criação da tabela de horários
CREATE TABLE IF NOT EXISTS public.horarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    status BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT horario_valido CHECK (hora_fim > hora_inicio)
);

-- Criação dos índices
CREATE INDEX IF NOT EXISTS idx_horarios_dia_semana ON public.horarios(dia_semana);
CREATE INDEX IF NOT EXISTS idx_horarios_status ON public.horarios(status);

-- Trigger para atualizar o updated_at
DROP TRIGGER IF EXISTS set_horarios_updated_at ON public.horarios;
CREATE TRIGGER set_horarios_updated_at
    BEFORE UPDATE ON public.horarios
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Configuração de segurança (RLS)
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;

-- Política para permitir select para todos
CREATE POLICY "Permitir select para todos" ON public.horarios
    FOR SELECT USING (true);

-- Política para permitir insert/update/delete apenas para administradores
CREATE POLICY "Permitir gerenciamento apenas para administradores" ON public.horarios
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE raw_user_meta_data->>'role' = 'admin'
    ));

-- Comentários nas colunas
COMMENT ON TABLE public.horarios IS 'Tabela que armazena os horários de funcionamento da barbearia';
COMMENT ON COLUMN public.horarios.id IS 'ID único do horário';
COMMENT ON COLUMN public.horarios.dia_semana IS 'Dia da semana (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)';
COMMENT ON COLUMN public.horarios.hora_inicio IS 'Hora de início do funcionamento';
COMMENT ON COLUMN public.horarios.hora_fim IS 'Hora de fim do funcionamento';
COMMENT ON COLUMN public.horarios.status IS 'Status do horário (true = ativo, false = inativo)';
COMMENT ON COLUMN public.horarios.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN public.horarios.updated_at IS 'Data e hora da última atualização do registro'; 