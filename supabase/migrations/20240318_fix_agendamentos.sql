-- Ajusta a estrutura da tabela de agendamentos para separar data e horário
ALTER TABLE public.agendamentos
  DROP COLUMN IF EXISTS data_hora,
  ADD COLUMN IF NOT EXISTS data DATE,
  ADD COLUMN IF NOT EXISTS horario TIME;

-- Adiciona índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON public.agendamentos(data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_horario ON public.agendamentos(horario);

-- Ajusta as políticas de RLS para permitir inserções de agendamentos
DROP POLICY IF EXISTS "Permitir insert apenas para próprio usuário" ON public.agendamentos;
CREATE POLICY "Permitir insert para usuários autenticados" ON public.agendamentos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Garante que todos os usuários autenticados possam ver os agendamentos
DROP POLICY IF EXISTS "Permitir select para usuários autenticados" ON public.agendamentos;
CREATE POLICY "Permitir select para usuários autenticados" ON public.agendamentos
  FOR SELECT USING (auth.role() = 'authenticated');

-- Garante que o cliente possa atualizar seus próprios agendamentos
DROP POLICY IF EXISTS "Permitir update para próprio usuário ou admin" ON public.agendamentos;
CREATE POLICY "Permitir update para próprio usuário ou admin" ON public.agendamentos
  FOR UPDATE USING (
    auth.uid() = cliente_id OR
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
  );

-- Adiciona trigger para validar horários
CREATE OR REPLACE FUNCTION public.validar_horario_agendamento()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se existe um horário de funcionamento para o dia
  IF NOT EXISTS (
    SELECT 1 FROM public.horarios h
    WHERE 
      (h.tipo_horario = 'semanal' AND h.dia_semana = EXTRACT(DOW FROM NEW.data)::integer) OR
      (h.tipo_horario = 'especifico' AND h.data_especifica = NEW.data)
  ) THEN
    RAISE EXCEPTION 'Não há horário de funcionamento disponível nesta data';
  END IF;

  -- Verifica se o horário está dentro do horário de funcionamento
  IF NOT EXISTS (
    SELECT 1 FROM public.horarios h
    WHERE 
      ((h.tipo_horario = 'semanal' AND h.dia_semana = EXTRACT(DOW FROM NEW.data)::integer) OR
       (h.tipo_horario = 'especifico' AND h.data_especifica = NEW.data)) AND
      NEW.horario >= h.hora_inicio AND
      NEW.horario <= h.hora_fim
  ) THEN
    RAISE EXCEPTION 'Horário fora do período de funcionamento';
  END IF;

  -- Verifica se já existe agendamento para o mesmo funcionário no mesmo horário
  IF EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE 
      a.funcionario_id = NEW.funcionario_id AND
      a.data = NEW.data AND
      a.horario = NEW.horario AND
      a.id != NEW.id AND
      a.status != 'cancelado'
  ) THEN
    RAISE EXCEPTION 'Já existe um agendamento para este horário';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validar_horario_agendamento ON public.agendamentos;
CREATE TRIGGER trigger_validar_horario_agendamento
  BEFORE INSERT OR UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_horario_agendamento(); 