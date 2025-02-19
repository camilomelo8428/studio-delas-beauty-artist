-- Nome: 004_create_table_agendamentos
-- Descrição: Cria a tabela de agendamentos e suas relações
-- Data: 2024-02-15

-- Criação do tipo ENUM para status do agendamento
CREATE TYPE public.status_agendamento AS ENUM (
    'pendente',
    'confirmado',
    'concluido',
    'cancelado'
);

-- Criação da tabela de agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id),
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id),
    servico_id UUID NOT NULL REFERENCES public.servicos(id),
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    status public.status_agendamento DEFAULT 'pendente' NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT horario_futuro CHECK (data_hora > TIMEZONE('utc'::text, NOW()))
);

-- Criação dos índices
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON public.agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_funcionario ON public.agendamentos(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_servico ON public.agendamentos(servico_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_hora ON public.agendamentos(data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON public.agendamentos(status);

-- Trigger para atualizar o updated_at
DROP TRIGGER IF EXISTS set_agendamentos_updated_at ON public.agendamentos;
CREATE TRIGGER set_agendamentos_updated_at
    BEFORE UPDATE ON public.agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Configuração de segurança (RLS)
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Política para permitir select para usuários autenticados
CREATE POLICY "Permitir select para usuários autenticados" ON public.agendamentos
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            auth.uid() = cliente_id OR
            auth.uid() IN (
                SELECT id FROM auth.users 
                WHERE raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- Política para permitir insert apenas para o próprio usuário
CREATE POLICY "Permitir insert apenas para próprio usuário" ON public.agendamentos
    FOR INSERT WITH CHECK (
        auth.uid() = cliente_id
    );

-- Política para permitir update apenas para o próprio usuário ou admin
CREATE POLICY "Permitir update para próprio usuário ou admin" ON public.agendamentos
    FOR UPDATE USING (
        auth.uid() = cliente_id OR
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Política para permitir delete apenas para admin
CREATE POLICY "Permitir delete apenas para admin" ON public.agendamentos
    FOR DELETE USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Comentários nas colunas
COMMENT ON TABLE public.agendamentos IS 'Tabela que armazena os agendamentos de serviços';
COMMENT ON COLUMN public.agendamentos.id IS 'ID único do agendamento';
COMMENT ON COLUMN public.agendamentos.cliente_id IS 'ID do cliente que fez o agendamento';
COMMENT ON COLUMN public.agendamentos.funcionario_id IS 'ID do funcionário que realizará o serviço';
COMMENT ON COLUMN public.agendamentos.servico_id IS 'ID do serviço agendado';
COMMENT ON COLUMN public.agendamentos.data_hora IS 'Data e hora do agendamento';
COMMENT ON COLUMN public.agendamentos.status IS 'Status do agendamento (pendente, confirmado, concluido, cancelado)';
COMMENT ON COLUMN public.agendamentos.observacao IS 'Observações adicionais sobre o agendamento';
COMMENT ON COLUMN public.agendamentos.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN public.agendamentos.updated_at IS 'Data e hora da última atualização do registro'; 