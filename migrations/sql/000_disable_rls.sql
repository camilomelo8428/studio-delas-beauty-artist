-- Nome: 000_disable_rls
-- Descrição: Desabilita as políticas de Row Level Security (RLS) em todas as tabelas
-- Data: 2024-02-15

-- Desabilita RLS para a tabela de clientes
ALTER TABLE IF EXISTS public.clientes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir select para usuários autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Permitir insert apenas para próprio usuário" ON public.clientes;
DROP POLICY IF EXISTS "Permitir update apenas para próprio usuário" ON public.clientes;

-- Desabilita RLS para a tabela de funcionários
ALTER TABLE IF EXISTS public.funcionarios DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir select para todos" ON public.funcionarios;
DROP POLICY IF EXISTS "Permitir gerenciamento apenas para administradores" ON public.funcionarios;

-- Desabilita RLS para a tabela de serviços
ALTER TABLE IF EXISTS public.servicos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir select para todos" ON public.servicos;
DROP POLICY IF EXISTS "Permitir gerenciamento apenas para administradores" ON public.servicos;

-- Desabilita RLS para a tabela de agendamentos
ALTER TABLE IF EXISTS public.agendamentos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir select para usuários autenticados" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir insert apenas para próprio usuário" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir update para próprio usuário ou admin" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir delete apenas para admin" ON public.agendamentos;

-- Desabilita RLS para a tabela de horários
ALTER TABLE IF EXISTS public.horarios DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir select para todos" ON public.horarios;
DROP POLICY IF EXISTS "Permitir gerenciamento apenas para administradores" ON public.horarios; 