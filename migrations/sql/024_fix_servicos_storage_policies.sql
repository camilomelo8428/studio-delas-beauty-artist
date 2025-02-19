-- Nome: 024_fix_servicos_storage_policies
-- Descrição: Ajusta as políticas de acesso ao storage para serviços
-- Data: 2024-03-18

-- Criar bucket para serviços se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('servicos', 'servicos', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Imagens de serviços são públicas" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar imagens de serviços" ON storage.objects;

-- Política para acesso público às imagens
CREATE POLICY "Imagens de serviços são públicas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'servicos');

-- Política para permitir upload/delete por usuários autenticados
CREATE POLICY "Usuários autenticados podem gerenciar imagens de serviços"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'servicos')
WITH CHECK (bucket_id = 'servicos');

-- Garantir que RLS está habilitado
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Garantir permissões para usuários autenticados
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Garantir que o bucket é público
UPDATE storage.buckets
SET public = true
WHERE id = 'servicos'; 