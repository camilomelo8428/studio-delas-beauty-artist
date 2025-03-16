import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { sounds } from '../../services/sounds'
import { notificationService } from '../../services/notifications'

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
    cargo: 'barbeiro' | 'cabeleireiro' | 'manicure' | 'esteticista_facial' | 'esteticista_corporal' | 'maquiador' | 'designer_sobrancelhas' | 'massagista' | 'depilador' | 'admin'
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
    cargo: 'barbeiro' | 'cabeleireiro' | 'manicure' | 'esteticista_facial' | 'esteticista_corporal' | 'maquiador' | 'designer_sobrancelhas' | 'massagista' | 'depilador' | 'admin'
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
  esteticista_facial: 'Esteticista Facial',
  esteticista_corporal: 'Esteticista Corporal',
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

  // Função para carregar agendamentos
  const carregarAgendamentos = async (filtro: string = filtroAtual) => {
    try {
      setLoading(true);
      setError(null);

      const funcionarioId = (await supabase.auth.getUser()).data.user?.id;
      if (!funcionarioId) throw new Error('Funcionário não autenticado');

      // Formatar data atual
      const hoje = new Date();
      const dataHoje = formatarData(hoje);
      
      console.log('Data de hoje formatada:', dataHoje);

      // Preparar query base
      let query = supabase
        .from('agendamentos')
        .select(`
          id,
          data,
          horario,
          status,
          cliente:clientes(nome,telefone),
          servico:servicos(nome,preco),
          funcionario:funcionarios(nome,cargo)
        `)
        .eq('funcionario_id', funcionarioId);

      // Aplicar filtro de data
      if (filtro === 'hoje') {
        console.log('Aplicando filtro para hoje:', dataHoje);
        query = query.eq('data', dataHoje);
      } else if (filtro === 'semana') {
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
        const dataInicioSemana = formatarData(inicioSemana);

        const fimSemana = new Date(hoje);
        fimSemana.setDate(hoje.getDate() + (6 - hoje.getDay()));
        const dataFimSemana = formatarData(fimSemana);

        console.log('Aplicando filtro para semana:', { dataInicioSemana, dataFimSemana });
        
        query = query
          .gte('data', dataInicioSemana)
          .lte('data', dataFimSemana);
      }

      // Executar query com ordenação
      const { data: agendamentosRaw, error: dbError } = await query
        .order('data', { ascending: true })
        .order('horario', { ascending: true });

      if (dbError) {
        console.error('Erro do banco:', dbError);
        throw dbError;
      }

      console.log('Agendamentos recebidos:', agendamentosRaw);

      // Transformar os dados garantindo que todos os campos obrigatórios existam
      const agendamentosFormatados = (agendamentosRaw || []).map((item: any): Agendamento => {
        // Garantir que a data seja válida
        let dataFormatada = item.data;
        if (!dataFormatada) {
          console.warn('Agendamento sem data:', item);
          dataFormatada = dataHoje;
        }

        return {
          id: item.id || '',
          data: dataFormatada,
          horario: item.horario || '00:00',
          status: (item.status as StatusAgendamento) || 'pendente',
          cliente: {
            nome: item.cliente?.nome || '',
            telefone: item.cliente?.telefone || ''
          },
          servico: {
            nome: item.servico?.nome || '',
            preco: item.servico?.preco || 0
          },
          funcionario: {
            nome: item.funcionario?.nome || '',
            cargo: (item.funcionario?.cargo as Agendamento['funcionario']['cargo']) || 'barbeiro'
          }
        };
      });

      console.log('Agendamentos formatados:', agendamentosFormatados);
      setAgendamentos(agendamentosFormatados);
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
      setError('Erro ao carregar agendamentos');
      sounds.play('erro');
    } finally {
      setLoading(false);
    }
  };

  // Efeito para carregar agendamentos iniciais
  useEffect(() => {
    carregarAgendamentos()
  }, [])

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
    await carregarAgendamentos(filtro)
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