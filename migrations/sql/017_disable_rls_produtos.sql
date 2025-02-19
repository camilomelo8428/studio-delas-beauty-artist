-- Nome: 017_disable_rls_produtos
-- Descrição: Desabilita temporariamente RLS para tabela de produtos
-- Data: 2024-03-18

-- Desabilitar RLS temporariamente
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;

-- Garantir permissões corretas
GRANT ALL ON public.produtos TO authenticated;
GRANT ALL ON public.produto_imagens TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Remover todas as políticas existentes para limpar
DROP POLICY IF EXISTS "Produtos são públicos para visualização" ON public.produtos;
DROP POLICY IF EXISTS "Administradores podem gerenciar produtos" ON public.produtos;

-- Criar política simplificada apenas para garantir
CREATE POLICY "Gerenciamento de produtos"
ON public.produtos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true); 