-- Cria o tipo enum para cargos se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cargo_funcionario') THEN
    CREATE TYPE cargo_funcionario AS ENUM (
      'barbeiro',
      'cabeleireiro',
      'manicure',
      'esteticista_facial',
      'esteticista_corporal',
      'maquiador',
      'designer_sobrancelhas',
      'massagista',
      'depilador',
      'admin'
    );
  ELSE
    -- Se o tipo já existe, adiciona os novos valores
    ALTER TYPE cargo_funcionario ADD VALUE IF NOT EXISTS 'esteticista_facial';
    ALTER TYPE cargo_funcionario ADD VALUE IF NOT EXISTS 'esteticista_corporal';
    ALTER TYPE cargo_funcionario ADD VALUE IF NOT EXISTS 'maquiador';
    ALTER TYPE cargo_funcionario ADD VALUE IF NOT EXISTS 'designer_sobrancelhas';
    ALTER TYPE cargo_funcionario ADD VALUE IF NOT EXISTS 'massagista';
    ALTER TYPE cargo_funcionario ADD VALUE IF NOT EXISTS 'depilador';
  END IF;
END $$;

-- Adiciona a coluna cargo se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'funcionarios' 
    AND column_name = 'cargo'
  ) THEN
    ALTER TABLE funcionarios 
    ADD COLUMN cargo cargo_funcionario DEFAULT 'barbeiro';
  END IF;
END $$;

-- Adiciona a coluna especialidades se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'funcionarios' 
    AND column_name = 'especialidades'
  ) THEN
    ALTER TABLE funcionarios 
    ADD COLUMN especialidades text[] DEFAULT '{}';
  END IF;
END $$;

-- Adiciona a coluna comissao se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'funcionarios' 
    AND column_name = 'comissao'
  ) THEN
    ALTER TABLE funcionarios 
    ADD COLUMN comissao integer DEFAULT 30;
  END IF;
END $$; 