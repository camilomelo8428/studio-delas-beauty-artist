-- Adiciona a coluna senha na tabela clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS senha VARCHAR(255);

-- Remove políticas existentes
DROP POLICY IF EXISTS "Permitir acesso aos dados do próprio cliente" ON clientes;
DROP POLICY IF EXISTS "Permitir acesso total para administradores" ON clientes;

-- Cria novas políticas RLS
CREATE POLICY "Permitir acesso aos dados do próprio cliente" ON clientes 
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Permitir acesso total para administradores" ON clientes 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Função para atualizar a senha do cliente
CREATE OR REPLACE FUNCTION atualizar_senha_cliente(
  p_cliente_id UUID,
  p_senha VARCHAR
) RETURNS void AS $$
BEGIN
  UPDATE clientes 
  SET senha = p_senha,
      updated_at = NOW()
  WHERE id = p_cliente_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 