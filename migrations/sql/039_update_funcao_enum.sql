-- Nome: 039_update_funcao_enum
-- Descrição: Atualiza o enum funcao_funcionario com todos os valores necessários
-- Data: 2024-03-21

-- Adicionamos os novos valores ao enum existente
ALTER TYPE funcao_funcionario ADD VALUE IF NOT EXISTS 'esteticista';
ALTER TYPE funcao_funcionario ADD VALUE IF NOT EXISTS 'maquiador';
ALTER TYPE funcao_funcionario ADD VALUE IF NOT EXISTS 'designer_sobrancelhas';
ALTER TYPE funcao_funcionario ADD VALUE IF NOT EXISTS 'massagista';
ALTER TYPE funcao_funcionario ADD VALUE IF NOT EXISTS 'depilador';

-- Comentário explicativo
COMMENT ON TYPE funcao_funcionario IS 'Funções disponíveis para os funcionários do estabelecimento'; 