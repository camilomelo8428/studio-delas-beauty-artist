import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { sounds } from '../../services/sounds'
import { notificationService } from '../../services/notifications'
import { format, toZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { useRealtimeAgendamentos } from '../../hooks/useRealtimeAgendamentos'

// Interfaces
type StatusAgendamento = 'pendente' | 'confirmado' | 'concluido' | 'cancelado'

interface Agendamento {
  id: string
  data: string
  horario: string
  status: StatusAgendamento
  cliente: {
    nome: string
    telefone: string
  }
  servico: {
    nome: string
    preco: number
  }
  funcionario: {
    nome: string
    cargo: 'barbeiro' | 'cabeleireiro' | 'manicure' | 'esteticista' | 'maquiador' | 'designer_sobrancelhas' | 'massagista' | 'depilador' | 'admin'
  }
}

interface AgendamentoResponse {
  id: string
  data: string
  horario: string
  status: StatusAgendamento
  cliente: {
    nome: string
    telefone: string
  }
  servico: {
    nome: string
    preco: number
  }
  funcionario: {
    nome: string
    cargo: 'barbeiro' | 'cabeleireiro' | 'manicure' | 'esteticista' | 'maquiador' | 'designer_sobrancelhas' | 'massagista' | 'depilador' | 'admin'
  }
}

interface AgendamentoRaw {
  id: string;
  data: string | null;
  horario: string | null;
  status: StatusAgendamento | null;
  cliente: {
    nome: string | null;
    telefone: string | null;
  };
  servico: {
    nome: string | null;
    preco: number | null;
  };
  funcionario: {
    nome: string | null;
    cargo: string | null;
  };
}

const CARGO_LABELS: { [key: string]: string } = {
  barbeiro: 'Barbeiro',
  cabeleireiro: 'Cabeleireiro',
  manicure: 'Manicure',
  esteticista: 'Esteticista',
  maquiador: 'Maquiador(a)',
  designer_sobrancelhas: 'Designer de Sobrancelhas',
  massagista: 'Massagista',
  depilador: 'Depilador(a)',
  admin: 'Administrador'
}

export default function FuncionarioArea() {
  // Estados
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroAtual, setFiltroAtual] = useState<string>('hoje')
  const [visualizacao, setVisualizacao] = useState<'lista' | 'cards'>('cards')
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null)

  const formatarData = (data: Date): string => {
    // Ajusta para o fuso horário local e retorna apenas a data
    return data.toLocaleDateString('en-CA'); // Formato YYYY-MM-DD
  };

  const carregarAgendamentos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Buscar o ID do funcionário atual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      if (!session?.user) {
        throw new Error('Usuário não autenticado')
      }

      // Formatar data atual
      const dataAtual = format(toZonedTime(new Date(), 'America/Sao_Paulo'), 'yyyy-MM-dd')

      const { data: agendamentosData, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes(nome, telefone),
          servico:servicos(nome, preco)
        `)
        .eq('funcionario_id', session.user.id)
        .eq('data', dataAtual)
        .order('horario', { ascending: true })

      if (error) throw error

      setAgendamentos(agendamentosData || [])
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err)
      setError('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }, [])

  // Usar o hook de Realtime
  useRealtimeAgendamentos(carregarAgendamentos)

  useEffect(() => {
    carregarAgendamentos()
  }, [carregarAgendamentos])

  // Efeito para notificações em tempo real
  useEffect(() => {
    // Inicializar o serviço de notificações em tempo real
    const unsubscribe = notificationService.initializeRealtime()

    // Registrar callback para atualizar dados quando receber novo agendamento
    const unsubscribeCallback = notificationService.onNewAppointment(async () => {
      sounds.play('agendamento-admin')
      await carregarAgendamentos()
    })

    return () => {
      unsubscribe()
      unsubscribeCallback()
    }
  }, [])

  const handleStatusChange = async (agendamentoId: string, novoStatus: StatusAgendamento) => {
    try {
      console.log('Tentando atualizar status:', { agendamentoId, novoStatus });

      // Validar o status antes de enviar
      if (!['pendente', 'confirmado', 'concluido', 'cancelado'].includes(novoStatus)) {
        throw new Error('Status inválido');
      }

      // Primeiro, buscar o agendamento atual para obter a data e horário
      const { data: agendamentoAtual, error: erroConsulta } = await supabase
        .from('agendamentos')
        .select('data, horario')
        .eq('id', agendamentoId)
        .single();

      if (erroConsulta || !agendamentoAtual) {
        console.error('Erro ao buscar agendamento:', erroConsulta);
        throw new Error('Agendamento não encontrado');
      }

      // Atualizar o status incluindo a data e horário originais
      const { error: erroAtualizacao } = await supabase
        .from('agendamentos')
        .update({
          status: novoStatus,
          data: agendamentoAtual.data,
          horario: agendamentoAtual.horario
        })
        .eq('id', agendamentoId);

      if (erroAtualizacao) {
        console.error('Erro ao atualizar status:', erroAtualizacao);
        sounds.play('erro');
        return;
      }

      console.log('Status atualizado com sucesso');
      sounds.play('status-change');
      await carregarAgendamentos();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      sounds.play('erro');
    }
  };

  const handleFiltroChange = async (filtro: string) => {
    setFiltroAtual(filtro)
    sounds.play('filter-change')
    await carregarAgendamentos()
  }

  const handleVisualizacaoChange = (tipo: 'lista' | 'cards') => {
    setVisualizacao(tipo)
    sounds.play('tab-change')
  }

  const handleModalOpen = (agendamento: Agendamento) => {
    setAgendamentoSelecionado(agendamento)
    sounds.play('modal-open')
  }

  const handleModalClose = () => {
    setAgendamentoSelecionado(null)
    sounds.play('modal-close')
  }

  // ... resto do código do componente ...
} 