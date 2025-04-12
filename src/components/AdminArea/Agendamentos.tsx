import { useState, useEffect, useCallback } from 'react'
import ConfirmationModal from '../ConfirmationModal'
import { supabase } from '../../lib/supabase'
import { sounds } from '../../services/sounds'
import { notificationService } from '../../services/notifications'
import { format, toZonedTime } from 'date-fns-tz'
import { parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRealtimeAgendamentos } from '../../hooks/useRealtimeAgendamentos'

interface Servico {
  id: string;
  nome: string;
  preco: number;
  descricao?: string;
  duracao_minutos?: number;
  foto_url?: string;
  categoria?: string;
  preco_promocional?: number;
  promocao_ativa?: boolean;
  promocao_inicio?: string;
  promocao_fim?: string;
  promocao_descricao?: string;
}

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  funcoes: { funcao: string }[];
  status: boolean;
  foto_url?: string;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
}

interface Agendamento {
  id: string;
  cliente_id: string;
  funcionario_id: string;
  servico_id: string;
  data: string;
  horario: string;
  status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado';
  observacao?: string;
  servico: Servico;
  funcionario: Funcionario;
  cliente: Cliente;
}

// Função utilitária para formatar datas
const formatarData = (data: string) => {
  try {
    return format(toZonedTime(parseISO(data), 'America/Sao_Paulo'), 'dd/MM/yyyy', { locale: ptBR })
  } catch (error) {
    console.error('Erro ao formatar data:', error)
    return data
  }
}

export default function Agendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [agendamentoEmEdicao, setAgendamentoEmEdicao] = useState<Agendamento | null>(null)
  const [dataInicial, setDataInicial] = useState(format(toZonedTime(new Date(), 'America/Sao_Paulo'), 'yyyy-MM-dd'))
  const [dataFinal, setDataFinal] = useState(format(toZonedTime(new Date(), 'America/Sao_Paulo'), 'yyyy-MM-dd'))
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [visualizacao, setVisualizacao] = useState<'lista' | 'cards'>('cards')
  const [agendamentoParaExcluir, setAgendamentoParaExcluir] = useState<Agendamento | null>(null)

  const carregarAgendamentos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Validar datas
      if (!dataInicial || !dataFinal) {
        throw new Error('Selecione um período válido')
      }

      // Formatar datas para o formato YYYY-MM-DD
      const dataInicialFormatada = new Date(dataInicial).toISOString().split('T')[0]
      const dataFinalFormatada = new Date(dataFinal).toISOString().split('T')[0]

      console.log('Buscando agendamentos:', { dataInicialFormatada, dataFinalFormatada, filtroStatus })

      const { data: agendamentosData, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes(nome, telefone),
          funcionario:funcionarios!inner(
            nome,
            funcoes:funcionario_funcoes!inner(funcao)
          ),
          servico:servicos(nome, preco, preco_promocional, promocao_ativa)
        `)
        .gte('data', dataInicialFormatada)
        .lte('data', dataFinalFormatada)
        .order('data', { ascending: true })
        .order('horario', { ascending: true })

      if (error) throw error

      // Filtrar por status se necessário
      let agendamentosFiltrados = agendamentosData || []
      if (filtroStatus !== 'todos') {
        agendamentosFiltrados = agendamentosFiltrados.filter(
          agendamento => agendamento.status === filtroStatus
        )
      }

      setAgendamentos(agendamentosFiltrados)
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err)
      setError('Erro ao carregar agendamentos')
      sounds.play('erro')
    } finally {
      setLoading(false)
    }
  }, [dataInicial, dataFinal, filtroStatus])

  // Usar o hook de Realtime
  useRealtimeAgendamentos(carregarAgendamentos)

  // Solicitar permissão de notificações ao montar o componente
  useEffect(() => {
    notificationService.requestNotificationPermission()
  }, [])

  // Inicializar notificações em tempo real
  useEffect(() => {
    const unsubscribe = notificationService.initializeRealtime()

    // Registrar callback para atualizar dados quando receber novo agendamento
    const unsubscribeCallback = notificationService.onNewAppointment(async () => {
      await carregarAgendamentos()
    })

    return () => {
      unsubscribe()
      unsubscribeCallback()
    }
  }, [carregarAgendamentos])

  useEffect(() => {
    carregarAgendamentos()
  }, [carregarAgendamentos])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (agendamentoEmEdicao) {
        await atualizarAgendamento(agendamentoEmEdicao.id, {
          status: agendamentoEmEdicao.status
        })
        sounds.play('status-change')
      }
      setModalAberto(false)
      setAgendamentoEmEdicao(null)
      
      // Recarrega os agendamentos com os filtros atuais
      await carregarAgendamentos()
    } catch (err) {
      console.error('Erro ao salvar agendamento:', err)
      sounds.play('erro')
    }
  }

  const agendamentosFiltrados = agendamentos.filter(agendamento => 
    filtroStatus === 'todos' || agendamento.status === filtroStatus
  )

  const handleVisualizacaoChange = (tipo: 'cards' | 'lista') => {
    setVisualizacao(tipo)
    sounds.play('tab-change')
  }

  const handleEditarClick = (agendamento: Agendamento) => {
    setAgendamentoEmEdicao(agendamento)
    setModalAberto(true)
    sounds.play('modal-open')
  }

  const handleModalClose = () => {
    setModalAberto(false)
    setAgendamentoEmEdicao(null)
    sounds.play('modal-close')
  }

  const handleExcluirClick = (agendamento: Agendamento) => {
    setAgendamentoParaExcluir(agendamento)
    sounds.play('modal-open')
  }

  const handleConfirmarExclusao = async () => {
    if (agendamentoParaExcluir) {
      await excluirAgendamento(agendamentoParaExcluir.id)
      setAgendamentoParaExcluir(null)
      sounds.play('delete')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'confirmado':
        return 'bg-blue-500/20 text-blue-400'
      case 'concluido':
        return 'bg-green-500/20 text-green-400'
      case 'cancelado':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
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

  const handleFiltrar = async () => {
    try {
      await carregarAgendamentos()
      sounds.play('filter-change')
    } catch (error) {
      console.error('Erro ao filtrar agendamentos:', error)
      sounds.play('erro')
    }
  }

  const atualizarAgendamento = async (id: string, agendamento: Partial<Agendamento>) => {
    try {
      setLoading(true)
      setError(null)

      // Buscar o agendamento atual para manter os dados que não serão alterados
      const { data: agendamentoAtual, error: erroConsulta } = await supabase
        .from('agendamentos')
        .select('data, horario')
        .eq('id', id)
        .single()

      if (erroConsulta) throw erroConsulta

      if (!agendamentoAtual) {
        throw new Error('Agendamento não encontrado')
      }

      // Manter a data e horário originais
      const dadosAtualizados = {
        ...agendamento,
        data: agendamentoAtual.data,
        horario: agendamentoAtual.horario
      }

      const { error } = await supabase
        .from('agendamentos')
        .update(dadosAtualizados)
        .eq('id', id)

      if (error) throw error

      // Não precisamos mais chamar carregarAgendamentos() aqui
      // pois o Realtime vai cuidar disso automaticamente
    } catch (err) {
      console.error('Erro ao atualizar agendamento:', err)
      setError('Erro ao atualizar agendamento')
      notificationService.error('Erro ao atualizar agendamento')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const excluirAgendamento = async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Não precisamos mais chamar carregarAgendamentos() aqui
      // pois o Realtime vai cuidar disso automaticamente
    } catch (err) {
      console.error('Erro ao excluir agendamento:', err)
      setError('Erro ao excluir agendamento')
      notificationService.error('Erro ao excluir agendamento')
      throw err
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Filtros */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-red-600/20 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-red-500">Agendamentos</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleVisualizacaoChange('cards')}
              className={`p-2 rounded-lg transition-colors ${
                visualizacao === 'cards' 
                  ? 'bg-red-600/20 text-red-500' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => handleVisualizacaoChange('lista')}
              className={`p-2 rounded-lg transition-colors ${
                visualizacao === 'lista' 
                  ? 'bg-red-600/20 text-red-500' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Data Inicial</label>
            <input
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg px-4 py-2 text-white focus:border-red-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">Data Final</label>
            <input
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg px-4 py-2 text-white focus:border-red-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg px-4 py-2 text-white focus:border-red-600 focus:outline-none"
            >
              <option value="todos">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="confirmado">Confirmado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFiltrar}
              className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white h-[42px] rounded-lg hover:from-red-700 hover:to-red-900 transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Filtrar
            </button>
          </div>
        </div>
      </div>
      
      {/* Visualização em Cards */}
      {visualizacao === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {agendamentosFiltrados.map(agendamento => (
            <div
              key={agendamento.id}
              className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-red-600/20 overflow-hidden hover:border-red-600/40 transition-all duration-300"
            >
              {/* Cabeçalho do Card */}
              <div className="p-4 border-b border-red-600/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                      <span className="text-lg font-semibold">{agendamento.horario}</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">
                        {formatarData(agendamento.data)}
                      </p>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agendamento.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {agendamento.status.charAt(0).toUpperCase() + agendamento.status.slice(1)}
                      </span>
                    </div>
                        </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditarClick(agendamento)}
                      className="p-1 text-blue-500 hover:text-blue-400 transition-colors"
                      title="Editar"
                      onMouseEnter={() => sounds.play('hover')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleExcluirClick(agendamento)}
                      className="p-1 text-red-500 hover:text-red-400 transition-colors"
                      title="Excluir"
                      onMouseEnter={() => sounds.play('hover')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Corpo do Card */}
              <div className="p-4 space-y-4">
                {/* Cliente */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium">{agendamento.cliente.nome.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {agendamento.cliente.nome}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {agendamento.cliente.telefone}
                    </div>
                  </div>
                </div>

                {/* Profissional */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium">{agendamento.funcionario.nome.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {agendamento.funcionario.nome}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {CARGO_LABELS[agendamento.funcionario.funcoes[0].funcao]}
                    </div>
                  </div>
                </div>

                {/* Serviço */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium">{agendamento.servico.nome.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {agendamento.servico.nome}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {agendamento.servico.promocao_ativa && agendamento.servico.preco_promocional ? (
                        <>
                          <span className="text-red-500">
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format(agendamento.servico.preco_promocional)}
                          </span>
                          <span className="text-gray-500 line-through ml-2">
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format(agendamento.servico.preco)}
                          </span>
                        </>
                      ) : (
                        new Intl.NumberFormat('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        }).format(agendamento.servico.preco)
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visualização em Lista */}
      {visualizacao === 'lista' && (
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-red-600/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-red-600/20">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Cliente</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Profissional</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Serviço</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400 text-center">Horário</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400 text-center">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-600/10">
                {agendamentosFiltrados.map(agendamento => (
                  <tr key={agendamento.id} className="hover:bg-red-600/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium">{agendamento.cliente.nome.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {agendamento.cliente.nome}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {agendamento.cliente.telefone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium">{agendamento.funcionario.nome.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {agendamento.funcionario.nome}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {CARGO_LABELS[agendamento.funcionario.funcoes[0].funcao]}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium">{agendamento.servico.nome.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {agendamento.servico.nome}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {agendamento.servico.promocao_ativa && agendamento.servico.preco_promocional ? (
                              <>
                                <span className="text-red-500">
                                  {new Intl.NumberFormat('pt-BR', { 
                                    style: 'currency', 
                                    currency: 'BRL' 
                                  }).format(agendamento.servico.preco_promocional)}
                                </span>
                                <span className="text-gray-500 line-through ml-2">
                                  {new Intl.NumberFormat('pt-BR', { 
                                    style: 'currency', 
                                    currency: 'BRL' 
                                  }).format(agendamento.servico.preco)}
                                </span>
                              </>
                            ) : (
                              new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(agendamento.servico.preco)
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center justify-center text-sm">
                        <div className="text-white font-medium">
                          {agendamento.horario}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatarData(agendamento.data)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agendamento.status)}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {agendamento.status.charAt(0).toUpperCase() + agendamento.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditarClick(agendamento)}
                          className="p-1 text-blue-500 hover:text-blue-400 transition-colors"
                          title="Editar"
                          onMouseEnter={() => sounds.play('hover')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleExcluirClick(agendamento)}
                          className="p-1 text-red-500 hover:text-red-400 transition-colors"
                          title="Excluir"
                          onMouseEnter={() => sounds.play('hover')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Modal de Editar Status */}
      {modalAberto && agendamentoEmEdicao && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg w-full max-w-md relative border border-red-600/30">
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-red-500 mb-6">
                Editar Status do Agendamento
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Status</label>
                  <select
                    value={agendamentoEmEdicao.status}
                    onChange={e => setAgendamentoEmEdicao({
                      ...agendamentoEmEdicao,
                      status: e.target.value as typeof agendamentoEmEdicao.status
                    })}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-lg hover:from-red-700 hover:to-red-900 transition-all"
                    onMouseEnter={() => sounds.play('hover')}
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="flex-1 border border-red-600/20 text-white py-3 rounded-lg hover:bg-red-600/10 transition-all"
                    onMouseEnter={() => sounds.play('hover')}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmationModal
        isOpen={!!agendamentoParaExcluir}
        onClose={() => setAgendamentoParaExcluir(null)}
        onConfirm={handleConfirmarExclusao}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o agendamento de ${agendamentoParaExcluir?.cliente?.nome || 'cliente'} para ${agendamentoParaExcluir ? formatarData(agendamentoParaExcluir.data) : ''} às ${agendamentoParaExcluir?.horario}?`}
        confirmText="Sim, Excluir"
        cancelText="Não, Manter"
        type="danger"
        isLoading={loading}
      />
    </div>
  )
} 