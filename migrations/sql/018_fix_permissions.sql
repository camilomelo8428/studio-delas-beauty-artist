-- Nome: 018_fix_permissions
-- Descrição: Ajusta permissões para garantir acesso completo aos produtos
-- Data: 2024-03-18

-- Garantir que RLS está desabilitado para produtos e imagens
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_imagens DISABLE ROW LEVEL SECURITY;

-- Garantir todas as permissões para o role authenticated
GRANT ALL ON public.produtos TO authenticated;
GRANT ALL ON public.produto_imagens TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Remover todas as políticas existentes para limpar
DROP POLICY IF EXISTS "Produtos são públicos para visualização" ON public.produtos;
DROP POLICY IF EXISTS "Administradores podem gerenciar produtos" ON public.produtos;
DROP POLICY IF EXISTS "Visualização pública de imagens" ON public.produto_imagens;
DROP POLICY IF EXISTS "Gerenciamento de imagens (admin)" ON public.produto_imagens;

-- Criar políticas simplificadas
CREATE POLICY "Acesso total a produtos"
ON public.produtos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Acesso total a imagens"
ON public.produto_imagens
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Garantir permissões no storage
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated; 