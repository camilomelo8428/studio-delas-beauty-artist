-- Nome: 016_fix_product_policies_again
-- Descrição: Corrige novamente as políticas de acesso para a tabela de produtos
-- Data: 2024-03-18

-- Remover políticas antigas
DROP POLICY IF EXISTS "Produtos são públicos para visualização" ON public.produtos;
DROP POLICY IF EXISTS "Administradores podem gerenciar produtos" ON public.produtos;

-- Política para leitura pública
CREATE POLICY "Produtos são públicos para visualização"
ON public.produtos
FOR SELECT
TO public
USING (true);

-- Política para administradores (simplificada)
CREATE POLICY "Administradores podem gerenciar produtos"
ON public.produtos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Garantir que RLS está habilitado
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Verificar e corrigir permissões da role authenticated
DO $$
BEGIN
  -- Garantir que a role authenticated tem todas as permissões necessárias
  GRANT ALL ON public.produtos TO authenticated;
  GRANT ALL ON public.produto_imagens TO authenticated;
  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
END $$; 