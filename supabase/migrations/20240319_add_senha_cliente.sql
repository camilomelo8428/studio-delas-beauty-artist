-- Adiciona a coluna senha na tabela de clientes
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS senha VARCHAR(255);

-- Atualiza as políticas de RLS para proteger o campo senha
DROP POLICY IF EXISTS "Permitir select para usuários autenticados" ON public.clientes;
CREATE POLICY "Permitir select para usuários autenticados" ON public.clientes
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      -- Permite que o próprio cliente veja seus dados
      auth.uid() = id OR
      -- Permite que administradores vejam todos os dados
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
      )
    )
  );

-- Função para atualizar senha do cliente
CREATE OR REPLACE FUNCTION public.atualizar_senha_cliente(
  p_cliente_id UUID,
  p_nova_senha VARCHAR
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.clientes
  SET senha = p_nova_senha
  WHERE id = p_cliente_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER; 