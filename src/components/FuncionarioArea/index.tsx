import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { sounds } from '../../services/sounds'
import { notificationService } from '../../services/notifications'

// Interfaces
interface Agendamento {
  id: number
  data: string
  horario: string
  status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado'
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

  // Função para carregar agendamentos
  const carregarAgendamentos = async (filtro: string = filtroAtual) => {
    try {
      setLoading(true)
      setError(null)

      const funcionarioId = (await supabase.auth.getUser()).data.user?.id
      if (!funcionarioId) throw new Error('Funcionário não autenticado')

      let query = supabase
        .from('agendamentos')
        .select(`
          id,
          data,
          horario,
          status,
          cliente:clientes!inner (
            nome,
            telefone
          ),
          servico:servicos!inner (
            nome,
            preco
          ),
          funcionario:funcionarios!inner (
            nome,
            cargo
          )
        `)
        .eq('funcionario_id', funcionarioId)

      // Aplicar filtro
      if (filtro === 'hoje') {
        const hoje = new Date().toISOString().split('T')[0]
        query = query.eq('data', hoje)
      } else if (filtro === 'semana') {
        const hoje = new Date()
        const inicioSemana = new Date(hoje)
        inicioSemana.setDate(hoje.getDate() - hoje.getDay())
        const fimSemana = new Date(hoje)
        fimSemana.setDate(inicioSemana.getDate() + 6)

        query = query
          .gte('data', inicioSemana.toISOString().split('T')[0])
          .lte('data', fimSemana.toISOString().split('T')[0])
      }

      const { data, error: dbError } = await query
        .order('data', { ascending: true })
        .order('horario', { ascending: true })

      if (dbError) throw dbError

      // Transformar os dados para corresponder à interface
      const agendamentosFormatados = (data || []).map(item => ({
        ...item,
        cliente: Array.isArray(item.cliente) ? item.cliente[0] : item.cliente,
        servico: Array.isArray(item.servico) ? item.servico[0] : item.servico,
        funcionario: Array.isArray(item.funcionario) ? item.funcionario[0] : item.funcionario
      }))

      setAgendamentos(agendamentosFormatados)
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err)
      setError('Erro ao carregar agendamentos')
      sounds.play('erro')
    } finally {
      setLoading(false)
    }
  }

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

  const handleStatusChange = async (agendamentoId: number, novoStatus: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: novoStatus })
        .eq('id', agendamentoId)

      if (error) throw error

      // Som de mudança de status
      sounds.play('status-change')
      
      // Recarregar agendamentos
      await carregarAgendamentos()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      sounds.play('erro')
    }
  }

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