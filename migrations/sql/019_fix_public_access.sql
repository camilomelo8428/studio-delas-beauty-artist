-- Nome: 019_fix_public_access
-- Descrição: Ajusta políticas para permitir acesso público aos produtos
-- Data: 2024-03-18

-- Habilitar RLS para produtos e imagens
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_imagens ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Acesso total a produtos" ON public.produtos;
DROP POLICY IF EXISTS "Acesso total a imagens" ON public.produto_imagens;

-- Criar política para leitura pública de produtos
CREATE POLICY "Produtos são públicos para visualização"
ON public.produtos
FOR SELECT
TO public
USING (status = true);

-- Criar política para leitura pública de imagens
CREATE POLICY "Imagens são públicas para visualização"
ON public.produto_imagens
FOR SELECT
TO public
USING (true);

-- Criar política para gerenciamento de produtos por usuários autenticados
CREATE POLICY "Gerenciamento de produtos por autenticados"
ON public.produtos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Criar política para gerenciamento de imagens por usuários autenticados
CREATE POLICY "Gerenciamento de imagens por autenticados"
ON public.produto_imagens
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Garantir que o bucket de produtos é público
UPDATE storage.buckets
SET public = true
WHERE id = 'produtos';

-- Garantir política de acesso público ao storage
CREATE POLICY "Acesso público ao storage de produtos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'produtos');

-- Garantir permissões para usuários autenticados
GRANT ALL ON public.produtos TO authenticated;
GRANT ALL ON public.produto_imagens TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated; 