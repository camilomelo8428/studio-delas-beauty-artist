-- Nome: 020_fix_product_permissions
-- Descrição: Corrige permissões para permitir gerenciamento completo de produtos
-- Data: 2024-03-18

-- Desabilitar RLS temporariamente para garantir acesso
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_imagens DISABLE ROW LEVEL SECURITY;

-- Garantir que o bucket de produtos é público
UPDATE storage.buckets
SET public = true
WHERE id = 'produtos';

-- Remover políticas antigas do storage
DROP POLICY IF EXISTS "Acesso público ao storage de produtos" ON storage.objects;
DROP POLICY IF EXISTS "Produtos são públicos para visualização" ON storage.objects;
DROP POLICY IF EXISTS "Imagens são públicas para visualização" ON storage.objects;

-- Criar políticas simplificadas para o storage
CREATE POLICY "Storage público para produtos"
ON storage.objects FOR ALL TO public
USING (bucket_id = 'produtos');

-- Garantir permissões para usuários autenticados
GRANT ALL ON public.produtos TO authenticated;
GRANT ALL ON public.produto_imagens TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Garantir permissões no storage
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated; 