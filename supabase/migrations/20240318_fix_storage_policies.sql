-- Nome: 20240318_fix_storage_policies
-- Descrição: Ajusta as políticas de acesso ao storage para funcionários
-- Data: 2024-03-18

-- Criar bucket para funcionários se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('funcionarios', 'funcionarios', true)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Imagens de funcionários são públicas" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar imagens" ON storage.objects;

-- Política para acesso público às imagens
CREATE POLICY "Imagens de funcionários são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'funcionarios');

-- Política para permitir upload/delete por usuários autenticados
CREATE POLICY "Usuários autenticados podem gerenciar imagens"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'funcionarios')
WITH CHECK (bucket_id = 'funcionarios');

-- Garantir que RLS está habilitado
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Garantir permissões para usuários autenticados
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated; 