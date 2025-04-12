-- Nome: 038_add_funcionario_funcoes
-- Descrição: Adiciona tabela de relacionamento entre funcionários e funções
-- Data: 2024-03-21

-- Cria a tabela de relacionamento
CREATE TABLE IF NOT EXISTS public.funcionario_funcoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    funcao funcao_funcionario NOT NULL,
    principal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(funcionario_id, funcao)
);

-- Cria índices
CREATE INDEX IF NOT EXISTS idx_funcionario_funcoes_funcionario_id ON public.funcionario_funcoes(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_funcionario_funcoes_funcao ON public.funcionario_funcoes(funcao);

-- Adiciona trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_funcionario_funcoes_updated_at
    BEFORE UPDATE ON public.funcionario_funcoes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.funcionario_funcoes IS 'Tabela de relacionamento entre funcionários e suas funções';
COMMENT ON COLUMN public.funcionario_funcoes.funcionario_id IS 'ID do funcionário';
COMMENT ON COLUMN public.funcionario_funcoes.funcao IS 'Função do funcionário';
COMMENT ON COLUMN public.funcionario_funcoes.principal IS 'Indica se esta é a função principal do funcionário'; 