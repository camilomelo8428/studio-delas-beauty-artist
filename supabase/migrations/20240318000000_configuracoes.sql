-- Criar tabela de configurações
CREATE TABLE IF NOT EXISTS configuracoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_empresa text NOT NULL,
  logo_url text,
  telefone text NOT NULL,
  email text NOT NULL,
  endereco text NOT NULL,
  bairro text NOT NULL,
  cidade text NOT NULL,
  estado text NOT NULL,
  cep text NOT NULL,
  horario_funcionamento text NOT NULL,
  instagram text,
  facebook text,
  whatsapp text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir configuração inicial
INSERT INTO configuracoes (
  nome_empresa,
  logo_url,
  telefone,
  email,
  endereco,
  bairro,
  cidade,
  estado,
  cep,
  horario_funcionamento,
  instagram,
  facebook,
  whatsapp
) VALUES (
  'CamiloTec',
  null,
  '(91) 98184-5943',
  'contato@camilotec.com.br',
  'Av. Principal, 1234',
  'Centro',
  'Belém',
  'PA',
  '66000-000',
  'Seg à Sex: 09h - 20h | Sáb: 09h - 18h | Dom: Fechado',
  '@camilotec',
  '/camilotec',
  '(91) 98184-5943'
) ON CONFLICT (id) DO NOTHING;

-- Criar bucket para armazenar logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('configuracoes', 'configuracoes', true)
ON CONFLICT (id) DO NOTHING;

-- Criar política de armazenamento para logos
CREATE POLICY "Logos são públicas para visualização" ON storage.objects
  FOR SELECT USING (bucket_id = 'configuracoes');

CREATE POLICY "Apenas admins podem gerenciar logos" ON storage.objects
  FOR ALL USING (bucket_id = 'configuracoes' AND auth.role() = 'authenticated'); 