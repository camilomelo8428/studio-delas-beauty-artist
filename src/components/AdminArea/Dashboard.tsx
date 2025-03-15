import { useState, useEffect } from 'react'
import { useAgendamentos } from '../../hooks/useAdmin'
import type { Agendamento } from '../../services/admin'
import jsPDF from 'jspdf'
import autoTable, { UserOptions } from 'jspdf-autotable'
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

  const [dataInicial, setDataInicial] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  )
  const [dataFinal, setDataFinal] = useState(
    new Date().toISOString().split('T')[0]
  )
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
    carregarAgendamentosPorData(dataInicial, dataFinal)
  }, [dataInicial, dataFinal])

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
      await carregarAgendamentosPorData(dataInicial, dataFinal)
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

  const filtrarAgendamentosPorPeriodo = (inicio: string, fim: string) => {
    if (!Array.isArray(agendamentos)) return []
    return agendamentos.filter(agendamento => {
      if (!agendamento || !agendamento.data) return false
      return agendamento.data >= inicio && agendamento.data <= fim
    })
  }

  const calcularEstatisticasPeriodo = (agendamentosFiltrados: Agendamento[]) => {
    const stats = agendamentosFiltrados.reduce((acc, agendamento) => {
      if (agendamento && agendamento.status) {
        acc[`${agendamento.status}s`]++
        acc.total++
        if (agendamento.status === 'concluido' && agendamento.servico?.preco) {
          acc.faturamento += Number(agendamento.servico.preco)
          acc.clientesAtendidos++
        }
      }
      return acc
    }, {
      pendentes: 0,
      confirmados: 0,
      concluidos: 0,
      cancelados: 0,
      total: 0,
      faturamento: 0,
      clientesAtendidos: 0
    })

    return {
      ...stats,
      ticketMedio: stats.clientesAtendidos > 0 ? stats.faturamento / stats.clientesAtendidos : 0
    }
  }

  const handlePeriodoChange = async () => {
    try {
      await carregarAgendamentosPorData(dataInicial, dataFinal)
      sounds.play('click')
    } catch (error) {
      console.error('Erro ao carregar dados do período:', error)
    }
  }

  const gerarRelatorioPDF = () => {
    const doc = new jsPDF()
    const agendamentosPeriodo = filtrarAgendamentosPorPeriodo(dataInicial, dataFinal)
    const estatisticasPeriodo = calcularEstatisticasPeriodo(agendamentosPeriodo)
    let yPos = 85
    
    // Título do relatório
    doc.setFontSize(20)
    doc.text('Relatório Studio D\'Elas Beauty Artist', 15, 15)
    doc.setFontSize(12)
    doc.text(`Período: ${new Date(dataInicial).toLocaleDateString('pt-BR')} a ${new Date(dataFinal).toLocaleDateString('pt-BR')}`, 15, 25)

    // Métricas do período
    doc.setFontSize(16)
    doc.text('Métricas do Período', 15, 35)
    doc.setFontSize(12)
    doc.text(`Total de Agendamentos: ${estatisticasPeriodo.total}`, 15, 45)
    doc.text(`Faturamento Total: ${formatarMoeda(estatisticasPeriodo.faturamento)}`, 15, 52)
    doc.text(`Ticket Médio: ${formatarMoeda(estatisticasPeriodo.ticketMedio)}`, 15, 59)
    doc.text(`Taxa de Conclusão: ${estatisticasPeriodo.total > 0 ? Math.round((estatisticasPeriodo.concluidos / estatisticasPeriodo.total) * 100) : 0}%`, 15, 66)

    // Status dos Agendamentos
    doc.setFontSize(16)
    doc.text('Status dos Agendamentos', 15, 80)
    
    autoTable(doc, {
      startY: yPos,
      head: [['Status', 'Quantidade']],
      body: [
        ['Pendentes', estatisticasPeriodo.pendentes],
        ['Confirmados', estatisticasPeriodo.confirmados],
        ['Concluídos', estatisticasPeriodo.concluidos],
        ['Cancelados', estatisticasPeriodo.cancelados],
        ['Total', estatisticasPeriodo.total]
      ],
    })

    // Faturamento dos últimos 7 dias
    yPos = 160
    doc.setFontSize(16)
    doc.text('Faturamento dos Últimos 7 Dias', 15, yPos)
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Data', 'Valor']],
      body: dadosFaturamento.map(item => [
        item.data,
        formatarMoeda(item.valor)
      ]),
    })

    // Próximos Agendamentos
    yPos = 235
    doc.setFontSize(16)
    doc.text('Próximos Agendamentos', 15, yPos)
    
    const proximosAgendamentos = agendamentosPeriodo.map(agendamento => [
      new Date(agendamento.data).toLocaleDateString('pt-BR'),
      agendamento.horario,
      agendamento.cliente.nome,
      agendamento.servico.nome,
      formatarMoeda(agendamento.servico.preco),
      agendamento.status.charAt(0).toUpperCase() + agendamento.status.slice(1)
    ])

    autoTable(doc, {
      startY: yPos + 5,
      head: [['Data', 'Horário', 'Cliente', 'Serviço', 'Valor', 'Status']],
      body: proximosAgendamentos,
    })

    // Salvar o PDF
    doc.save(`relatorio-studio-delas-${new Date(dataInicial).toLocaleDateString('pt-BR').replace(/\//g, '-')}-${new Date(dataFinal).toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`)
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gold-500">Dashboard</h2>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Seletor de Período */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">Data Inicial</label>
              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className="bg-[#1a1a1a] border border-gold-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-600/40"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">Data Final</label>
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className="bg-[#1a1a1a] border border-gold-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-600/40"
              />
            </div>
            <button
              onClick={handlePeriodoChange}
              className="mt-6 px-4 py-2 bg-gradient-to-r from-gold-600 to-gold-700 text-white rounded-lg hover:from-gold-700 hover:to-gold-800 transition-all"
              onMouseEnter={handleCardHover}
            >
              Filtrar
            </button>
          </div>

          {/* Botão Gerar PDF */}
          <button
            onClick={gerarRelatorioPDF}
            className="px-4 py-2 bg-gradient-to-r from-gold-600 to-gold-700 text-white rounded-lg hover:from-gold-700 hover:to-gold-800 transition-all flex items-center gap-2"
            onMouseEnter={handleCardHover}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586L7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
            </svg>
            Gerar Relatório PDF
          </button>
        </div>
      </div>

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