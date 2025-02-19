-- Nome: 025_disable_rls_servicos_storage
-- Descrição: Desabilita temporariamente RLS para storage de serviços
-- Data: 2024-03-18

-- Remover todas as políticas existentes para o bucket de serviços
DROP POLICY IF EXISTS "Imagens de serviços são públicas" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar imagens de serviços" ON storage.objects;
DROP POLICY IF EXISTS "Storage público para serviços" ON storage.objects;

-- Criar bucket para serviços se não existir e garantir que é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('servicos', 'servicos', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Desabilitar RLS temporariamente para objetos do storage
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Garantir permissões completas para usuários autenticados
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.buckets TO anon;

-- Criar uma única política simplificada
CREATE POLICY "Acesso total ao storage de serviços"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'servicos')
WITH CHECK (bucket_id = 'servicos'); 