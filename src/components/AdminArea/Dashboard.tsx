import { useState, useEffect } from 'react'
import { useAgendamentos } from '../../hooks/useAdmin'
import type { Agendamento } from '../../services/admin'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { sounds } from '../../services/sounds'
import { notificationService } from '../../services/notifications'

export default function Dashboard() {
  const { 
    agendamentos, 
    loading, 
    error,
    carregarAgendamentosPorData,
    carregarAgendamentosPorStatus
  } = useAgendamentos()

  const [dataAtual] = useState(new Date().toISOString().split('T')[0])
  const [estatisticas, setEstatisticas] = useState({
    pendentes: 0,
    confirmados: 0,
    concluidos: 0,
    cancelados: 0,
    total: 0
  })

  // Dados para os gráficos
  const [dadosFaturamento, setDadosFaturamento] = useState<any[]>([])
  const [dadosAgendamentosPorStatus, setDadosAgendamentosPorStatus] = useState<any[]>([])
  const [dadosAgendamentosPorHora, setDadosAgendamentosPorHora] = useState<any[]>([])

  useEffect(() => {
    carregarAgendamentosPorData(dataAtual)
  }, [dataAtual])

  useEffect(() => {
    if (agendamentos && Array.isArray(agendamentos)) {
      // Estatísticas gerais
      const stats = agendamentos.reduce((acc, agendamento) => {
        if (agendamento && agendamento.status) {
          acc[`${agendamento.status}s`]++
          acc.total++
        }
        return acc
      }, {
        pendentes: 0,
        confirmados: 0,
        concluidos: 0,
        cancelados: 0,
        total: 0
      })
      setEstatisticas(stats)

      // Dados para o gráfico de pizza
      const dadosStatus = [
        { name: 'Pendentes', value: stats.pendentes, color: '#EAB308' },
        { name: 'Confirmados', value: stats.confirmados, color: '#3B82F6' },
        { name: 'Concluídos', value: stats.concluidos, color: '#22C55E' },
        { name: 'Cancelados', value: stats.cancelados, color: '#EF4444' }
      ]
      setDadosAgendamentosPorStatus(dadosStatus)

      // Dados para o gráfico de faturamento dos últimos 7 dias
      const ultimosSeteDias = [...Array(7)].map((_, i) => {
        const data = new Date()
        data.setDate(data.getDate() - i)
        return data.toISOString().split('T')[0]
      }).reverse()

      const dadosFat = ultimosSeteDias.map(data => {
        const agendamentosDoDia = agendamentos.filter(a => 
          a.data === data && 
          a.status === 'concluido'
        )
        const faturamento = agendamentosDoDia.reduce((total, a) => 
          total + Number(a.servico.preco), 0
        )
        return {
          data: new Date(data).toLocaleDateString('pt-BR', { weekday: 'short' }),
          valor: faturamento
        }
      })
      setDadosFaturamento(dadosFat)

      // Dados para o gráfico de agendamentos por hora
      const horasDisponiveis = [...Array(12)].map((_, i) => {
        const hora = 8 + i // Considerando horário comercial das 8h às 20h
        return `${hora.toString().padStart(2, '0')}:00`
      })

      const dadosHora = horasDisponiveis.map(hora => {
        const quantidade = agendamentos.filter(a => 
          a.horario.startsWith(hora) && 
          ['pendente', 'confirmado', 'concluido'].includes(a.status)
        ).length
        return { hora, quantidade }
      })
      setDadosAgendamentosPorHora(dadosHora)
    }
  }, [agendamentos])

  useEffect(() => {
    // Inicializar o serviço de notificações em tempo real
    const unsubscribe = notificationService.initializeRealtime()

    // Registrar callback para atualizar dados quando receber novo agendamento
    const unsubscribeCallback = notificationService.onNewAppointment(async () => {
      const hoje = new Date().toISOString().split('T')[0]
      await carregarAgendamentosPorData(hoje)
    })

    return () => {
      unsubscribe()
      unsubscribeCallback()
    }
  }, [carregarAgendamentosPorData])

  // Função para formatar o valor em reais
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  // Cálculos para o dashboard
  const hoje = new Date().toISOString().split('T')[0]
  const agendamentosHoje = Array.isArray(agendamentos) 
    ? agendamentos.filter(a => a && a.data === hoje)
    : []

  const faturamentoHoje = agendamentosHoje
    .filter(a => a && a.status === 'concluido' && a.servico && a.servico.preco)
    .reduce((total, a) => total + Number(a.servico.preco), 0)

  const clientesAtendidosHoje = agendamentosHoje
    .filter(a => a && a.status === 'concluido')
    .length

  const ticketMedioHoje = clientesAtendidosHoje > 0 
    ? faturamentoHoje / clientesAtendidosHoje 
    : 0

  // Adicionar som ao clicar em "Ver todos"
  const handleVerTodosClick = () => {
    sounds.play('click')
    // Implementar navegação para a página de agendamentos
  }

  // Adicionar hover sound nos cards
  const handleCardHover = () => {
    sounds.play('hover')
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

  const agendamentosFiltrados = Array.isArray(agendamentos) 
    ? agendamentos
      .filter(agendamento => 
        agendamento && 
        agendamento.status && 
        ['pendente', 'confirmado'].includes(agendamento.status)
      )
      .sort((a, b) => {
        if (!a || !b || !a.data || !b.data || !a.horario || !b.horario) return 0
        const dataComparison = a.data.localeCompare(b.data)
        if (dataComparison !== 0) return dataComparison
        return a.horario.localeCompare(b.horario)
      })
      .slice(0, 3)
    : []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-red-500">Dashboard</h2>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-gold-600/20 p-6"
          onMouseEnter={handleCardHover}
        >
          <h3 className="text-gray-400 text-sm mb-2">Agendamentos Hoje</h3>
          <p className="text-3xl font-bold text-white">{agendamentosHoje.length}</p>
          <div className="mt-4 space-y-1">
            <p className="text-sm">
              <span className="text-yellow-400">•</span>
              <span className="text-gray-400 ml-2">Pendentes: {estatisticas.pendentes}</span>
            </p>
            <p className="text-sm">
              <span className="text-blue-400">•</span>
              <span className="text-gray-400 ml-2">Confirmados: {estatisticas.confirmados}</span>
            </p>
            <p className="text-sm">
              <span className="text-green-400">•</span>
              <span className="text-gray-400 ml-2">Concluídos: {estatisticas.concluidos}</span>
            </p>
            <p className="text-sm">
              <span className="text-red-400">•</span>
              <span className="text-gray-400 ml-2">Cancelados: {estatisticas.cancelados}</span>
            </p>
          </div>
        </div>

        <div 
          className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-gold-600/20 p-6"
          onMouseEnter={handleCardHover}
        >
          <h3 className="text-gray-400 text-sm mb-2">Faturamento Hoje</h3>
          <p className="text-3xl font-bold text-white">{formatarMoeda(faturamentoHoje)}</p>
          <p className="mt-4 text-sm text-gray-400">
            {clientesAtendidosHoje} clientes atendidos
          </p>
        </div>

        <div 
          className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-gold-600/20 p-6"
          onMouseEnter={handleCardHover}
        >
          <h3 className="text-gray-400 text-sm mb-2">Ticket Médio</h3>
          <p className="text-3xl font-bold text-white">{formatarMoeda(ticketMedioHoje)}</p>
          <p className="mt-4 text-sm text-gray-400">
            Média por cliente hoje
          </p>
        </div>

        <div 
          className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-gold-600/20 p-6"
          onMouseEnter={handleCardHover}
        >
          <h3 className="text-gray-400 text-sm mb-2">Taxa de Conclusão</h3>
          <p className="text-3xl font-bold text-white">
            {estatisticas.total > 0 
              ? `${Math.round((estatisticas.concluidos / estatisticas.total) * 100)}%`
              : '0%'
            }
          </p>
          <p className="mt-4 text-sm text-gray-400">
            Agendamentos concluídos
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Faturamento */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-gold-600/20 p-6">
          <h3 className="text-white text-lg font-semibold mb-4">Faturamento dos Últimos 7 Dias</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosFaturamento}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="data" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a',
                    border: '1px solid rgba(255, 192, 0, 0.2)',
                    borderRadius: '0.5rem'
                  }}
                  formatter={(value: number) => [formatarMoeda(value), 'Faturamento']}
                />
                <Line 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#FFC000" 
                  strokeWidth={2}
                  dot={{ fill: '#FFC000' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Status */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-gold-600/20 p-6">
          <h3 className="text-white text-lg font-semibold mb-4">Distribuição de Status</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosAgendamentosPorStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dadosAgendamentosPorStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a',
                    border: '1px solid rgba(255, 192, 0, 0.2)',
                    borderRadius: '0.5rem'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {dadosAgendamentosPorStatus.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-gray-400">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico de Agendamentos por Hora */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-gold-600/20 p-6 lg:col-span-2">
          <h3 className="text-white text-lg font-semibold mb-4">Agendamentos por Horário</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosAgendamentosPorHora}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="hora" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a',
                    border: '1px solid rgba(255, 192, 0, 0.2)',
                    borderRadius: '0.5rem'
                  }}
                />
                <Bar dataKey="quantidade" fill="#FFC000" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Próximos Agendamentos */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-gold-600/20 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Próximos Agendamentos</h3>
          <button 
            className="text-gold-500 hover:text-gold-400 transition-colors"
            onClick={handleVerTodosClick}
            onMouseEnter={handleCardHover}
          >
            Ver todos
          </button>
        </div>

        <div className="space-y-4">
          {agendamentosFiltrados.map(agendamento => (
            <div
              key={agendamento.id}
              className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-gold-600/10"
              onMouseEnter={handleCardHover}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gold-600/20 flex items-center justify-center">
                  <span className="text-lg font-semibold">
                    {agendamento.horario}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">{agendamento.servico.nome}</h4>
                  <p className="text-sm text-gray-400">{agendamento.cliente.nome}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">
                  {new Date(agendamento.data).toLocaleDateString('pt-BR')}
                </p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                  agendamento.status === 'pendente'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {agendamento.status.charAt(0).toUpperCase() + agendamento.status.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 