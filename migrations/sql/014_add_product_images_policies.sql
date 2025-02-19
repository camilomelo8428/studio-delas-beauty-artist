-- Nome: 014_add_product_images_policies
-- Descrição: Adiciona políticas de acesso para a tabela de imagens de produtos
-- Data: 2024-03-18

-- Habilitar RLS para a tabela de imagens de produtos
ALTER TABLE public.produto_imagens ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Visualização pública de imagens" ON public.produto_imagens;
DROP POLICY IF EXISTS "Gerenciamento de imagens (admin)" ON public.produto_imagens;

-- Política para visualização pública
CREATE POLICY "Visualização pública de imagens"
ON public.produto_imagens
FOR SELECT
TO public
USING (true);

-- Política para gerenciamento (admin)
CREATE POLICY "Gerenciamento de imagens (admin)"
ON public.produto_imagens
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true); 