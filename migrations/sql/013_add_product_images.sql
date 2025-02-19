-- Nome: 013_add_product_images
-- Descrição: Adiciona suporte a múltiplas imagens por produto e melhora o armazenamento
-- Data: 2024-03-18

-- Criar tabela de imagens de produtos
CREATE TABLE IF NOT EXISTS public.produto_imagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    principal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índice único parcial para garantir apenas uma imagem principal por produto
CREATE UNIQUE INDEX IF NOT EXISTS idx_produto_imagens_principal_unique 
ON public.produto_imagens (produto_id) 
WHERE principal = true;

-- Comentários da tabela
COMMENT ON TABLE public.produto_imagens IS 'Tabela de imagens dos produtos';
COMMENT ON COLUMN public.produto_imagens.produto_id IS 'ID do produto relacionado';
COMMENT ON COLUMN public.produto_imagens.url IS 'URL da imagem no storage';
COMMENT ON COLUMN public.produto_imagens.ordem IS 'Ordem de exibição da imagem';
COMMENT ON COLUMN public.produto_imagens.principal IS 'Indica se é a imagem principal do produto';

-- Índices
CREATE INDEX IF NOT EXISTS idx_produto_imagens_produto ON public.produto_imagens(produto_id);
CREATE INDEX IF NOT EXISTS idx_produto_imagens_principal ON public.produto_imagens(principal) WHERE principal = true;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS set_produto_imagens_updated_at ON public.produto_imagens;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER set_produto_imagens_updated_at
    BEFORE UPDATE ON public.produto_imagens
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Criar bucket para produtos se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos', 'produtos', true)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Visualização pública de imagens de produtos" ON storage.objects;
DROP POLICY IF EXISTS "Upload de imagens de produtos (admin)" ON storage.objects;
DROP POLICY IF EXISTS "Atualização de imagens de produtos (admin)" ON storage.objects;
DROP POLICY IF EXISTS "Exclusão de imagens de produtos (admin)" ON storage.objects;

-- Política para acesso público (leitura)
CREATE POLICY "Acesso público aos produtos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'produtos');

-- Política para inserção de arquivos
CREATE POLICY "Inserção de arquivos nos produtos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'produtos');

-- Política para atualização de arquivos
CREATE POLICY "Atualização de arquivos nos produtos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'produtos');

-- Política para exclusão de arquivos
CREATE POLICY "Exclusão de arquivos nos produtos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'produtos');

-- Habilitar RLS para a tabela de objetos
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; 