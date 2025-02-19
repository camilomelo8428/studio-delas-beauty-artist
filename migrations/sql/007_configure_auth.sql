-- Nome: 007_configure_auth
-- Descrição: Configura a autenticação e triggers necessários
-- Data: 2024-02-15

-- Habilita o cadastro por email/senha
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Função para sincronizar dados do usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.clientes (id, nome, telefone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'telefone', '')
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger para criar cliente quando um novo usuário for criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Política para permitir cadastro
CREATE POLICY "Permitir cadastro público" ON auth.users
    FOR INSERT WITH CHECK (true);

-- Política para permitir login
CREATE POLICY "Permitir login" ON auth.users
    FOR SELECT USING (true);

-- Remove a restrição de formato do telefone temporariamente
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS telefone_format;

-- Adiciona uma restrição mais flexível
ALTER TABLE public.clientes ADD CONSTRAINT telefone_format 
    CHECK (telefone ~ '^[0-9()\- +]*$');

-- Comentários
COMMENT ON FUNCTION public.handle_new_user IS 'Função para criar automaticamente um registro na tabela clientes quando um novo usuário for criado'; 