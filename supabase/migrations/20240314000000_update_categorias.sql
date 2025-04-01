-- Primeiro, vamos criar um backup da tabela produtos
CREATE TABLE produtos_backup AS SELECT * FROM produtos;

-- Agora vamos dropar o tipo enum existente e criar um novo
DROP TYPE categoria_produto CASCADE;
CREATE TYPE categoria_produto AS ENUM (
  'cabelo',
  'estetica',
  'manicure',
  'maquiagem',
  'depilacao',
  'massagem',
  'sobrancelhas',
  'tratamentos'
);

-- Recriar a tabela produtos com o novo tipo
CREATE TABLE produtos_new (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  preco decimal(10,2) NOT NULL,
  categoria categoria_produto NOT NULL,
  status boolean DEFAULT true,
  foto_url text,
  preco_promocional decimal(10,2),
  promocao_ativa boolean DEFAULT false,
  promocao_inicio timestamp with time zone,
  promocao_fim timestamp with time zone,
  promocao_descricao text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Copiar os dados da tabela de backup para a nova tabela
-- Note que precisamos converter as categorias antigas para as novas
INSERT INTO produtos_new (
  id, nome, descricao, preco, categoria, status,
  foto_url, preco_promocional, promocao_ativa,
  promocao_inicio, promocao_fim, promocao_descricao,
  created_at, updated_at
)
SELECT 
  id, nome, descricao, preco,
  CASE 
    WHEN categoria = 'barbearia' THEN 'cabelo'::categoria_produto
    WHEN categoria = 'salao' THEN 'cabelo'::categoria_produto
    ELSE 'cabelo'::categoria_produto
  END as categoria,
  status, foto_url, preco_promocional, promocao_ativa,
  promocao_inicio, promocao_fim, promocao_descricao,
  created_at, updated_at
FROM produtos_backup;

-- Dropar a tabela antiga e renomear a nova
DROP TABLE produtos CASCADE;
ALTER TABLE produtos_new RENAME TO produtos;

-- Recriar os índices e constraints
CREATE INDEX idx_produtos_categoria ON produtos(categoria);
CREATE INDEX idx_produtos_status ON produtos(status);
CREATE INDEX idx_produtos_promocao_ativa ON produtos(promocao_ativa);

-- Dropar a tabela de backup
DROP TABLE produtos_backup; 