# Migrações SQL - Barbearia App

Este diretório contém todos os scripts SQL necessários para criar e manter o banco de dados da aplicação.

## Estrutura de Arquivos

- `sql/000_disable_rls.sql`: Script para desabilitar as políticas de segurança (RLS)
- `sql/001_create_table_clientes.sql`: Criação da tabela de clientes
- `sql/002_create_table_funcionarios.sql`: Criação da tabela de funcionários (barbeiros)
- `sql/003_create_table_servicos.sql`: Criação da tabela de serviços oferecidos
- `sql/004_create_table_agendamentos.sql`: Criação da tabela de agendamentos e suas relações

## Ordem de Execução

Os scripts devem ser executados na ordem numérica para garantir que as dependências sejam respeitadas:

1. (Opcional) Execute `000_disable_rls.sql` se desejar desabilitar as políticas de segurança
2. Execute `001_create_table_clientes.sql`
3. Execute `002_create_table_funcionarios.sql`
4. Execute `003_create_table_servicos.sql`
5. Execute `004_create_table_agendamentos.sql`

> **Nota**: O script `000_disable_rls.sql` é opcional e deve ser usado apenas em ambiente de desenvolvimento. Em produção, as políticas RLS devem estar ativas para garantir a segurança dos dados.

## Detalhes das Tabelas

### Clientes
- Armazena informações dos clientes
- Vinculada à tabela `auth.users` do Supabase

### Funcionários
- Armazena informações dos barbeiros
- Inclui status de ativo/inativo

### Serviços
- Catálogo de serviços oferecidos
- Inclui preço, duração e descrição

### Agendamentos
- Registra os agendamentos de serviços
- Relaciona cliente, funcionário e serviço
- Status: pendente, confirmado, concluído ou cancelado

## Políticas de Segurança (RLS)

Por padrão, cada tabela possui suas próprias políticas de segurança que podem ser desabilitadas usando o script `000_disable_rls.sql`:

- **Clientes**: Acesso restrito ao próprio usuário
- **Funcionários**: Leitura pública, gerenciamento apenas por admin
- **Serviços**: Leitura pública, gerenciamento apenas por admin
- **Agendamentos**: Acesso controlado por cliente e admin

## Índices

Foram criados índices estratégicos para otimizar as consultas mais comuns:

- Busca por telefone em clientes
- Busca por nome e status em funcionários
- Busca por nome, status e preço em serviços
- Busca por cliente, funcionário, serviço, data/hora e status em agendamentos

## Manutenção

Ao fazer alterações no banco de dados:

1. Crie um novo arquivo SQL com o próximo número sequencial
2. Documente as alterações no início do arquivo
3. Atualize este README se necessário
4. Teste as alterações em um ambiente de desenvolvimento antes de aplicar em produção

## Ambiente de Desenvolvimento

Para facilitar o desenvolvimento, você pode:

1. Executar o script `000_disable_rls.sql` para desabilitar as políticas de segurança
2. Executar os scripts de criação das tabelas na ordem correta
3. Inserir dados de teste
4. Desenvolver e testar suas funcionalidades sem restrições de acesso

> **Importante**: Antes de implantar em produção, certifique-se de:
> 1. NÃO executar o script `000_disable_rls.sql`
> 2. Verificar se todas as políticas de segurança estão ativas
> 3. Remover quaisquer dados de teste 