-- Nome: 015_fix_product_policies
-- Descrição: Corrige as políticas de acesso para a tabela de produtos
-- Data: 2024-03-18

-- Remover políticas antigas
DROP POLICY IF EXISTS "Produtos são públicos para visualização" ON public.produtos;
DROP POLICY IF EXISTS "Administradores podem gerenciar produtos" ON public.produtos;

-- Política para leitura pública (mais permissiva)
CREATE POLICY "Produtos são públicos para visualização"
ON public.produtos
FOR SELECT
TO public
USING (true);

-- Política para administradores (mais específica)
CREATE POLICY "Administradores podem gerenciar produtos"
ON public.produtos
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Garantir que RLS está habilitado
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY; 