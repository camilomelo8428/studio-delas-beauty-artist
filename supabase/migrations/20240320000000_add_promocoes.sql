-- Adicionar colunas para promoções na tabela servicos
ALTER TABLE servicos
ADD COLUMN IF NOT EXISTS preco_promocional DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS promocao_ativa BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS promocao_inicio TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS promocao_fim TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS promocao_descricao TEXT;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Permitir leitura de promoções para todos" ON servicos;
DROP POLICY IF EXISTS "Permitir atualização de promoções apenas para admin" ON servicos;

-- Criar política RLS para leitura de promoções
CREATE POLICY "Permitir leitura de promoções para todos" ON servicos
FOR SELECT
USING (true);

-- Criar política RLS para atualização de promoções (apenas admin)
CREATE POLICY "Permitir atualização de promoções apenas para admin" ON servicos
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM funcionarios f 
    WHERE f.id = auth.uid() 
    AND f.funcao = 'admin'
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM funcionarios f 
    WHERE f.id = auth.uid() 
    AND f.funcao = 'admin'
  )
);

-- Criar função para verificar se um serviço está em promoção
CREATE OR REPLACE FUNCTION servico_em_promocao(
  promocao_ativa boolean,
  promocao_inicio timestamptz,
  promocao_fim timestamptz
) RETURNS boolean AS $$
BEGIN
  RETURN 
    promocao_ativa = true AND
    promocao_inicio <= CURRENT_TIMESTAMP AND
    promocao_fim >= CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Criar view para serviços em promoção
CREATE OR REPLACE VIEW servicos_em_promocao AS
SELECT 
    s.*,
    servico_em_promocao(s.promocao_ativa, s.promocao_inicio, s.promocao_fim) as promocao_vigente,
    CASE 
        WHEN servico_em_promocao(s.promocao_ativa, s.promocao_inicio, s.promocao_fim) THEN
            ROUND((1 - (s.preco_promocional / s.preco)) * 100)
        ELSE
            0
    END as percentual_desconto
FROM 
    servicos s
WHERE 
    servico_em_promocao(s.promocao_ativa, s.promocao_inicio, s.promocao_fim) = true;

-- Adicionar triggers para validação de promoções
CREATE OR REPLACE FUNCTION validar_promocao()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar preço promocional
    IF NEW.promocao_ativa = true THEN
        IF NEW.preco_promocional IS NULL THEN
            RAISE EXCEPTION 'Preço promocional é obrigatório quando a promoção está ativa';
        END IF;
        
        IF NEW.preco_promocional >= NEW.preco THEN
            RAISE EXCEPTION 'Preço promocional deve ser menor que o preço normal';
        END IF;
        
        IF NEW.promocao_inicio IS NULL OR NEW.promocao_fim IS NULL THEN
            RAISE EXCEPTION 'Datas de início e fim são obrigatórias quando a promoção está ativa';
        END IF;
        
        IF NEW.promocao_inicio >= NEW.promocao_fim THEN
            RAISE EXCEPTION 'Data de início deve ser anterior à data de fim';
        END IF;
        
        IF NEW.promocao_descricao IS NULL OR NEW.promocao_descricao = '' THEN
            RAISE EXCEPTION 'Descrição da promoção é obrigatória quando a promoção está ativa';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validação antes de inserir ou atualizar
DROP TRIGGER IF EXISTS trigger_validar_promocao ON servicos;
CREATE TRIGGER trigger_validar_promocao
    BEFORE INSERT OR UPDATE ON servicos
    FOR EACH ROW
    EXECUTE FUNCTION validar_promocao(); 