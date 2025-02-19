-- Nome: 012_create_table_produtos
-- Descrição: Cria a tabela de produtos para a loja virtual
-- Data: 2024-03-18

-- Criação do tipo enum para categoria de produto
DO $$ BEGIN
    CREATE TYPE categoria_produto AS ENUM (
        'cabelo',
        'barba',
        'skincare',
        'perfumaria',
        'acessorios'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criação da tabela de produtos
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) NOT NULL,
    preco_promocional DECIMAL(10,2),
    estoque INTEGER NOT NULL DEFAULT 0,
    categoria categoria_produto NOT NULL,
    marca TEXT,
    foto_url TEXT,
    destaque BOOLEAN DEFAULT false,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Comentários da tabela
COMMENT ON TABLE public.produtos IS 'Tabela de produtos da loja virtual';
COMMENT ON COLUMN public.produtos.nome IS 'Nome do produto';
COMMENT ON COLUMN public.produtos.descricao IS 'Descrição detalhada do produto';
COMMENT ON COLUMN public.produtos.preco IS 'Preço regular do produto';
COMMENT ON COLUMN public.produtos.preco_promocional IS 'Preço promocional do produto (quando em promoção)';
COMMENT ON COLUMN public.produtos.estoque IS 'Quantidade disponível em estoque';
COMMENT ON COLUMN public.produtos.categoria IS 'Categoria do produto';
COMMENT ON COLUMN public.produtos.marca IS 'Marca do produto';
COMMENT ON COLUMN public.produtos.foto_url IS 'URL da foto do produto';
COMMENT ON COLUMN public.produtos.destaque IS 'Indica se o produto deve aparecer em destaque';
COMMENT ON COLUMN public.produtos.status IS 'Status do produto (ativo/inativo)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_destaque ON public.produtos(destaque) WHERE destaque = true;
CREATE INDEX IF NOT EXISTS idx_produtos_status ON public.produtos(status) WHERE status = true;

-- Trigger para atualizar updated_at
CREATE TRIGGER set_produtos_updated_at
    BEFORE UPDATE ON public.produtos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Criar bucket para fotos de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos', 'produtos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket de produtos
CREATE POLICY "Imagens de produtos são públicas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'produtos');

CREATE POLICY "Apenas admins podem gerenciar imagens de produtos"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'produtos' AND auth.role() = 'authenticated');

-- Inserir alguns produtos de exemplo
INSERT INTO public.produtos (
    nome,
    descricao,
    preco,
    preco_promocional,
    estoque,
    categoria,
    marca,
    foto_url,
    destaque,
    status
) VALUES 
    (
        'Pomada Modeladora Matte',
        'Pomada modeladora com acabamento matte para um visual natural e duradouro. Ideal para todos os tipos de cabelo.',
        89.90,
        79.90,
        50,
        'cabelo',
        'Viking',
        'https://i.imgur.com/example1.jpg',
        true,
        true
    ),
    (
        'Óleo para Barba Premium',
        'Óleo hidratante para barba com fragrância amadeirada. Contém ingredientes naturais que auxiliam no crescimento saudável.',
        69.90,
        NULL,
        30,
        'barba',
        'Beard Master',
        'https://i.imgur.com/example2.jpg',
        true,
        true
    ),
    (
        'Kit Skincare Masculino',
        'Kit completo para cuidados com a pele contendo: sabonete facial, hidratante e protetor solar.',
        199.90,
        169.90,
        20,
        'skincare',
        'Men Care',
        'https://i.imgur.com/example3.jpg',
        true,
        true
    ),
    (
        'Perfume Black Edition',
        'Fragrância masculina com notas amadeiradas e cítricas. Duração prolongada.',
        299.90,
        NULL,
        15,
        'perfumaria',
        'Golden Skull',
        'https://i.imgur.com/example4.jpg',
        true,
        true
    ),
    (
        'Navalha Profissional',
        'Navalha em aço inoxidável com cabo ergonômico. Ideal para barbeiros profissionais.',
        159.90,
        129.90,
        25,
        'acessorios',
        'Pro Barber',
        'https://i.imgur.com/example5.jpg',
        false,
        true
    );

-- Habilitar RLS para a tabela de produtos
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Criar política para leitura pública
CREATE POLICY "Produtos são públicos para visualização"
ON public.produtos
FOR SELECT
TO public
USING (status = true);

-- Criar política para administradores
CREATE POLICY "Administradores podem gerenciar produtos"
ON public.produtos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Criar política para leitura pública das imagens
CREATE POLICY "Imagens de produtos são públicas para visualização"
ON public.produto_imagens
FOR SELECT
TO public
USING (true);

-- Criar política para administradores gerenciarem imagens
CREATE POLICY "Administradores podem gerenciar imagens"
ON public.produto_imagens
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Habilitar RLS para a tabela de imagens
ALTER TABLE public.produto_imagens ENABLE ROW LEVEL SECURITY; 