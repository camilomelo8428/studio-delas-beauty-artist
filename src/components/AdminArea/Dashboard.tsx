import { useState, useEffect } from 'react'
import { useAgendamentos } from '../../hooks/useAdmin'
import type { Agendamento } from '../../services/admin'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
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
  Cell,
  Legend
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { sounds } from '../../services/sounds'
import { notificationService } from '../../services/notifications'
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'

const hoje = format(toZonedTime(new Date(), 'America/Sao_Paulo'), 'yyyy-MM-dd')

interface DadosLucro {
  data: string
  lucroTotal: number
  totalServicos: number
}

interface Estatisticas {
  pendentes: number
  confirmados: number
  concluidos: number
  cancelados: number
  total: number
}

interface Resumo {
  lucroTotal: number
  totalServicos: number
  mediaTicket: number
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataInicial, setDataInicial] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dataFinal, setDataFinal] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [dadosLucro, setDadosLucro] = useState<DadosLucro[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    pendentes: 0,
    confirmados: 0,
    concluidos: 0,
    cancelados: 0,
    total: 0
  })
  const [resumo, setResumo] = useState<Resumo>({
    lucroTotal: 0,
    totalServicos: 0,
    mediaTicket: 0
  })

  // Dados para os gráficos
  const [dadosFaturamento, setDadosFaturamento] = useState<any[]>([])
  const [dadosAgendamentosPorStatus, setDadosAgendamentosPorStatus] = useState<any[]>([])
  const [dadosAgendamentosPorHora, setDadosAgendamentosPorHora] = useState<any[]>([])
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'hoje' | '7dias' | 'mes'>('hoje')

  useEffect(() => {
    carregarDados()
  }, [dataInicial, dataFinal])

  const carregarDados = async () => {
    try {
      setLoading(true)
      setError(null)

      // Garantir que as datas estejam definidas
      const dataAtual = format(toZonedTime(new Date(), 'America/Sao_Paulo'), 'yyyy-MM-dd')
      const dataInicialFormatada = dataInicial || dataAtual
      const dataFinalFormatada = dataFinal || dataAtual

      console.log('Datas da consulta:', { dataInicialFormatada, dataFinalFormatada })

      // Buscar agendamentos
      const { data: agendamentos, error: erroAgendamentos } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data,
          horario,
          status,
          cliente:clientes(nome, telefone),
          funcionario:funcionarios(nome),
          servico:servicos(nome, preco)
        `)
        .gte('data', dataInicialFormatada)
        .lte('data', dataFinalFormatada)
        .order('data', { ascending: true })
        .order('horario', { ascending: true })

      if (erroAgendamentos) {
        console.error('Erro ao buscar agendamentos:', erroAgendamentos)
        throw new Error('Erro ao buscar agendamentos')
      }

      const agendamentosCarregados = agendamentos as unknown as Agendamento[]
      setAgendamentos(agendamentosCarregados)

      // Calcular estatísticas
      const stats = {
        pendentes: agendamentosCarregados.filter(a => a.status === 'pendente').length,
        confirmados: agendamentosCarregados.filter(a => a.status === 'confirmado').length,
        concluidos: agendamentosCarregados.filter(a => a.status === 'concluido').length,
        cancelados: agendamentosCarregados.filter(a => a.status === 'cancelado').length,
        total: agendamentosCarregados.length
      }
      setEstatisticas(stats)

      // Preparar dados para o gráfico de status
      const dadosStatus = [
        { name: 'Pendentes', value: stats.pendentes, color: '#EAB308' },
        { name: 'Confirmados', value: stats.confirmados, color: '#3B82F6' },
        { name: 'Concluídos', value: stats.concluidos, color: '#10B981' },
        { name: 'Cancelados', value: stats.cancelados, color: '#EF4444' }
      ]
      setDadosAgendamentosPorStatus(dadosStatus)

      // Preparar dados para o gráfico de faturamento
      const dadosFaturamentoPorDia = new Map<string, number>()
      agendamentosCarregados
        .filter(a => a.status === 'concluido')
        .forEach(agendamento => {
          const data = format(toZonedTime(parseISO(agendamento.data), 'America/Sao_Paulo'), 'dd/MM', { locale: ptBR })
          const valorAtual = dadosFaturamentoPorDia.get(data) || 0
          dadosFaturamentoPorDia.set(data, valorAtual + agendamento.servico.preco)
        })

      const dadosFaturamentoProcessados = Array.from(dadosFaturamentoPorDia.entries())
        .map(([data, valor]) => ({ data, valor }))
        .sort((a, b) => a.data.localeCompare(b.data))

      setDadosFaturamento(dadosFaturamentoProcessados)

      // Preparar dados para o gráfico de agendamentos por hora
      const dadosPorHora = new Map<string, number>()
      agendamentosCarregados.forEach(agendamento => {
        const hora = agendamento.horario.split(':')[0] + 'h'
        const quantidadeAtual = dadosPorHora.get(hora) || 0
        dadosPorHora.set(hora, quantidadeAtual + 1)
      })

      const dadosHoraProcessados = Array.from(dadosPorHora.entries())
        .map(([hora, quantidade]) => ({ hora, quantidade }))
        .sort((a, b) => a.hora.localeCompare(b.hora))

      setDadosAgendamentosPorHora(dadosHoraProcessados)

      // Calcular dados de lucro por dia
      const dadosPorDia = new Map<string, DadosLucro>()
      
      agendamentosCarregados.forEach(agendamento => {
        const data = agendamento.data
        if (!dadosPorDia.has(data)) {
          dadosPorDia.set(data, {
            data,
            lucroTotal: 0,
            totalServicos: 0
          })
        }

        const dadosDia = dadosPorDia.get(data)!
        if (agendamento.status === 'concluido') {
          const valorServico = agendamento.servico.preco
          
          dadosDia.lucroTotal += valorServico
          dadosDia.totalServicos += 1
        }
      })

      const dadosOrdenados = Array.from(dadosPorDia.values())
        .sort((a, b) => a.data.localeCompare(b.data))
        .map(dado => ({
          ...dado,
          data: format(toZonedTime(parseISO(dado.data), 'America/Sao_Paulo'), 'dd/MM', { locale: ptBR })
        }))

      setDadosLucro(dadosOrdenados)

      // Calcular resumo geral
      const resumoCalculado = dadosOrdenados.reduce((acc, dado) => ({
        lucroTotal: acc.lucroTotal + dado.lucroTotal,
        totalServicos: acc.totalServicos + dado.totalServicos,
        mediaTicket: 0 // Será calculado abaixo
      }), {
        lucroTotal: 0,
        totalServicos: 0,
        mediaTicket: 0
      })

      resumoCalculado.mediaTicket = resumoCalculado.totalServicos > 0 
        ? resumoCalculado.lucroTotal / resumoCalculado.totalServicos 
        : 0

      setResumo(resumoCalculado)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setError('Erro ao carregar dados. Por favor, tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Função para formatar o valor em reais
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  // Cálculos para o dashboard
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

  const handlePeriodoChange = () => {
    carregarDados()
  }

  const gerarRelatorioPDF = () => {
    try {
      // Configuração inicial do documento
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Adicionar logo e cabeçalho
      doc.setFillColor(255, 192, 0)
      doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F')
      
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('Studio Delas Beauty Artist', 105, 20, { align: 'center' })
      
      doc.setFontSize(16)
      doc.text('Relatório Financeiro', 105, 30, { align: 'center' })

      let posicaoY = 50

      // Período do relatório
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Período: ${format(toZonedTime(parseISO(dataInicial), 'America/Sao_Paulo'), 'dd/MM/yyyy')} a ${format(toZonedTime(parseISO(dataFinal), 'America/Sao_Paulo'), 'dd/MM/yyyy')}`,
        105,
        posicaoY,
        { align: 'center' }
      )
      posicaoY += 15

      // Resumo Financeiro
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 192, 0)
      doc.text('Resumo Financeiro', 20, posicaoY)
      posicaoY += 10

      const dadosResumo = [
        ['Lucro Total', formatarMoeda(resumo.lucroTotal)],
        ['Total de Serviços', resumo.totalServicos.toString()],
        ['Ticket Médio', formatarMoeda(resumo.mediaTicket)],
        ['Média Diária', formatarMoeda(resumo.lucroTotal / (dadosLucro.length || 1))]
      ]

      autoTable(doc, {
        startY: posicaoY,
        head: [['Métrica', 'Valor']],
        body: dadosResumo,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 192, 0],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 12
        },
        styles: {
          fontSize: 10,
          textColor: [0, 0, 0],
          cellPadding: 5
        },
        alternateRowStyles: {
          fillColor: [255, 248, 225]
        }
      })

      posicaoY = (doc as any).lastAutoTable.finalY + 20

      // Estatísticas de Agendamentos
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 192, 0)
      doc.text('Estatísticas de Agendamentos', 20, posicaoY)
      posicaoY += 10

      const dadosEstatisticas = [
        ['Pendentes', estatisticas.pendentes.toString(), `${((estatisticas.pendentes / estatisticas.total) * 100).toFixed(1)}%`],
        ['Confirmados', estatisticas.confirmados.toString(), `${((estatisticas.confirmados / estatisticas.total) * 100).toFixed(1)}%`],
        ['Concluídos', estatisticas.concluidos.toString(), `${((estatisticas.concluidos / estatisticas.total) * 100).toFixed(1)}%`],
        ['Cancelados', estatisticas.cancelados.toString(), `${((estatisticas.cancelados / estatisticas.total) * 100).toFixed(1)}%`],
        ['Total', estatisticas.total.toString(), '100%']
      ]

      autoTable(doc, {
        startY: posicaoY,
        head: [['Status', 'Quantidade', 'Taxa']],
        body: dadosEstatisticas,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 192, 0],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 12
        },
        styles: {
          fontSize: 10,
          textColor: [0, 0, 0],
          cellPadding: 5
        },
        alternateRowStyles: {
          fillColor: [255, 248, 225]
        }
      })

      posicaoY = (doc as any).lastAutoTable.finalY + 20

      // Detalhamento por Dia
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 192, 0)
      doc.text('Detalhamento por Dia', 20, posicaoY)
      posicaoY += 10

      const dadosDetalhados = dadosLucro.map(dado => [
        dado.data,
        formatarMoeda(dado.lucroTotal),
        dado.totalServicos.toString(),
        formatarMoeda(dado.lucroTotal / dado.totalServicos || 0)
      ])

      autoTable(doc, {
        startY: posicaoY,
        head: [['Data', 'Lucro Total', 'Serviços', 'Ticket Médio']],
        body: dadosDetalhados,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 192, 0],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 12
        },
        styles: {
          fontSize: 9,
          textColor: [0, 0, 0],
          cellPadding: 5
        },
        alternateRowStyles: {
          fillColor: [255, 248, 225]
        }
      })

      posicaoY = (doc as any).lastAutoTable.finalY + 20

      // Nova seção: Detalhamento dos Serviços Concluídos
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 192, 0)
      doc.text('Detalhamento dos Serviços Concluídos', 20, posicaoY)
      posicaoY += 10

      // Agrupar serviços por tipo
      const servicosPorTipo = agendamentos
        .filter(a => a.status === 'concluido')
        .reduce((acc, agendamento) => {
          const servicoNome = agendamento.servico.nome
          if (!acc[servicoNome]) {
            acc[servicoNome] = {
              quantidade: 0,
              valorTotal: 0,
              duracaoTotal: 0
            }
          }
          acc[servicoNome].quantidade++
          acc[servicoNome].valorTotal += agendamento.servico.preco
          acc[servicoNome].duracaoTotal += agendamento.servico.duracao_minutos
          return acc
        }, {} as Record<string, { quantidade: number; valorTotal: number; duracaoTotal: number }>)

      const dadosServicos = Object.entries(servicosPorTipo).map(([servico, dados]) => [
        servico,
        dados.quantidade.toString(),
        formatarMoeda(dados.valorTotal),
        formatarMoeda(dados.valorTotal / dados.quantidade),
        `${Math.floor(dados.duracaoTotal / 60)}h${dados.duracaoTotal % 60}min`,
        `${((dados.quantidade / resumo.totalServicos) * 100).toFixed(1)}%`
      ])

      autoTable(doc, {
        startY: posicaoY,
        head: [['Serviço', 'Quantidade', 'Valor Total', 'Ticket Médio', 'Tempo Total', 'Taxa']],
        body: dadosServicos,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 192, 0],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 12
        },
        styles: {
          fontSize: 9,
          textColor: [0, 0, 0],
          cellPadding: 5
        },
        alternateRowStyles: {
          fillColor: [255, 248, 225]
        }
      })

      posicaoY = (doc as any).lastAutoTable.finalY + 20

      // Nova seção: Detalhamento por Profissional
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 192, 0)
      doc.text('Detalhamento por Profissional', 20, posicaoY)
      posicaoY += 10

      // Agrupar serviços por profissional
      const servicosPorProfissional = agendamentos
        .filter(a => a.status === 'concluido')
        .reduce((acc, agendamento) => {
          const profissionalNome = agendamento.funcionario.nome
          if (!acc[profissionalNome]) {
            acc[profissionalNome] = {
              cargo: agendamento.funcionario.cargo,
              quantidade: 0,
              valorTotal: 0,
              duracaoTotal: 0,
              servicosRealizados: new Set<string>()
            }
          }
          acc[profissionalNome].quantidade++
          acc[profissionalNome].valorTotal += agendamento.servico.preco
          acc[profissionalNome].duracaoTotal += agendamento.servico.duracao_minutos
          acc[profissionalNome].servicosRealizados.add(agendamento.servico.nome)
          return acc
        }, {} as Record<string, { 
          cargo: string; 
          quantidade: number; 
          valorTotal: number; 
          duracaoTotal: number;
          servicosRealizados: Set<string>;
        }>)

      const dadosProfissionais = Object.entries(servicosPorProfissional).map(([profissional, dados]) => [
        profissional,
        dados.cargo,
        dados.quantidade.toString(),
        formatarMoeda(dados.valorTotal),
        formatarMoeda(dados.valorTotal / dados.quantidade),
        `${Math.floor(dados.duracaoTotal / 60)}h${dados.duracaoTotal % 60}min`,
        Array.from(dados.servicosRealizados).join(', ')
      ])

      autoTable(doc, {
        startY: posicaoY,
        head: [['Profissional', 'Cargo', 'Atendimentos', 'Valor Total', 'Ticket Médio', 'Tempo Total', 'Serviços Realizados']],
        body: dadosProfissionais,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 192, 0],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 12
        },
        styles: {
          fontSize: 8,
          textColor: [0, 0, 0],
          cellPadding: 5
        },
        alternateRowStyles: {
          fillColor: [255, 248, 225]
        }
      })

      // Rodapé
      const dataGeracao = format(toZonedTime(new Date(), 'America/Sao_Paulo'), 'dd/MM/yyyy HH:mm')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(128, 128, 128)
      doc.text(
        `Relatório gerado em ${dataGeracao}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      )

      // Salvar o PDF
      const nomeArquivo = `relatorio-financeiro-${format(toZonedTime(parseISO(dataInicial), 'America/Sao_Paulo'), 'dd-MM-yyyy')}-a-${format(toZonedTime(parseISO(dataFinal), 'America/Sao_Paulo'), 'dd-MM-yyyy')}.pdf`
      doc.save(nomeArquivo)

      // Tocar som de sucesso
      sounds.play('sucesso')
      
      // Notificar sucesso
      notificationService.success('Relatório gerado com sucesso!')
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      sounds.play('erro')
      notificationService.error('Erro ao gerar relatório. Por favor, tente novamente.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-gold-600/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-gold-600 border-t-transparent animate-spin"></div>
        </div>
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
      {/* Cabeçalho e Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gold-500">Dashboard</h2>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <label className="text-sm text-gray-400">Data Inicial</label>
              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className="bg-[#1a1a1a] border border-gold-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-600/40"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-400">Data Final</label>
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className="bg-[#1a1a1a] border border-gold-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-600/40"
              />
            </div>
            <button
              onClick={handlePeriodoChange}
              className="mt-6 px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors"
            >
              Filtrar
            </button>
          </div>
          
          <button
            onClick={gerarRelatorioPDF}
            className="px-4 py-2 bg-gold-600/20 text-gold-500 rounded-lg hover:bg-gold-600/30 transition-colors flex items-center gap-2"
          >
            <span>📊</span>
            Gerar Relatório PDF
          </button>
          </div>
        </div>

      {/* Estatísticas do Dia */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gold-600/20">
          <h3 className="text-lg font-semibold text-gold-500 mb-4">Agendamentos Hoje</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Pendentes:</span>
              <span className="text-yellow-500 font-semibold">{estatisticas.pendentes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Confirmados:</span>
              <span className="text-blue-500 font-semibold">{estatisticas.confirmados}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Concluídos:</span>
              <span className="text-green-500 font-semibold">{estatisticas.concluidos}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Cancelados:</span>
              <span className="text-red-500 font-semibold">{estatisticas.cancelados}</span>
            </div>
            <div className="pt-2 border-t border-gold-600/10">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total:</span>
                <span className="text-gold-500 font-semibold">{estatisticas.total}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gold-600/20">
          <h3 className="text-lg font-semibold text-gold-500 mb-4">Faturamento Hoje</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Valor Total:</span>
              <span className="text-gold-500 font-semibold">{formatarMoeda(faturamentoHoje)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Clientes Atendidos:</span>
              <span className="text-blue-500 font-semibold">{clientesAtendidosHoje}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Ticket Médio:</span>
              <span className="text-emerald-500 font-semibold">{formatarMoeda(ticketMedioHoje)}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gold-600/20">
          <h3 className="text-lg font-semibold text-gold-500 mb-4">Taxa de Conclusão</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Agendados:</span>
              <span className="text-blue-500 font-semibold">{estatisticas.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Concluídos:</span>
              <span className="text-green-500 font-semibold">{estatisticas.concluidos}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Taxa:</span>
              <span className="text-gold-500 font-semibold">
            {estatisticas.total > 0 
                  ? `${((estatisticas.concluidos / estatisticas.total) * 100).toFixed(1)}%`
              : '0%'
            }
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gold-600/20">
          <h3 className="text-lg font-semibold text-gold-500 mb-4">Resumo do Período</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Lucro Total:</span>
              <span className="text-gold-500 font-semibold">{formatarMoeda(resumo.lucroTotal)}</span>
            </div>
            <div className="pt-2 border-t border-gold-600/10">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Média Diária:</span>
                <span className="text-emerald-500 font-semibold">
                  {formatarMoeda(resumo.lucroTotal / (dadosLucro.length || 1))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gold-600/20">
          <h3 className="text-sm text-gray-400 mb-2">Lucro Total</h3>
          <p className="text-2xl font-bold text-gold-500">{formatarMoeda(resumo.lucroTotal)}</p>
          <p className="text-sm text-gray-400 mt-1">No período selecionado</p>
        </div>
        <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gold-600/20">
          <h3 className="text-sm text-gray-400 mb-2">Total de Serviços</h3>
          <p className="text-2xl font-bold text-purple-500">{resumo.totalServicos}</p>
          <p className="text-sm text-gray-400 mt-1">Serviços realizados</p>
        </div>
        <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gold-600/20">
          <h3 className="text-sm text-gray-400 mb-2">Ticket Médio</h3>
          <p className="text-2xl font-bold text-rose-500">{formatarMoeda(resumo.mediaTicket)}</p>
          <p className="text-sm text-gray-400 mt-1">Por atendimento</p>
        </div>
        <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gold-600/20">
          <h3 className="text-sm text-gray-400 mb-2">Média Diária</h3>
          <p className="text-2xl font-bold text-emerald-500">
            {formatarMoeda(resumo.lucroTotal / (dadosLucro.length || 1))}
          </p>
          <p className="text-sm text-gray-400 mt-1">Faturamento médio</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Linha - Evolução do Lucro */}
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gold-600/20">
          <h3 className="text-lg font-semibold text-gold-500 mb-4">Evolução do Lucro</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosLucro} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis 
                  dataKey="data" 
                  stroke="#666"
                  tick={{ fill: '#666' }}
                />
                <YAxis 
                  stroke="#666"
                  tick={{ fill: '#666' }}
                  tickFormatter={(value) => formatarMoeda(value)}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255, 192, 0, 0.2)' }}
                  labelStyle={{ color: '#999' }}
                  formatter={(value: number) => [formatarMoeda(value)]}
                />
                <Legend wrapperStyle={{ color: '#666' }} />
                <Line 
                  type="monotone" 
                  dataKey="lucroTotal"
                  name="Lucro Total"
                  stroke="#FFC000"
                  strokeWidth={2}
                  dot={{ fill: '#FFC000' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Barras - Comparativo */}
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gold-600/20">
          <h3 className="text-lg font-semibold text-gold-500 mb-4">Comparativo</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosLucro} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis 
                  dataKey="data" 
                  stroke="#666"
                  tick={{ fill: '#666' }}
                />
                <YAxis 
                  stroke="#666"
                  tick={{ fill: '#666' }}
                  tickFormatter={(value) => formatarMoeda(value)}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255, 192, 0, 0.2)' }}
                  labelStyle={{ color: '#999' }}
                  formatter={(value: number) => [formatarMoeda(value)]}
                />
                <Legend wrapperStyle={{ color: '#666' }} />
                <Bar 
                  dataKey="lucroTotal" 
                  name="Lucro Total" 
                  fill="#FFC000" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Status */}
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gold-600/20">
          <h3 className="text-lg font-semibold text-gold-500 mb-4">Distribuição de Status</h3>
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
                  formatter={(value: number) => [value, 'Agendamentos']}
                />
                <Legend 
                  wrapperStyle={{ color: '#666' }}
                  formatter={(value) => <span style={{ color: '#666' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Agendamentos por Hora */}
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gold-600/20">
          <h3 className="text-lg font-semibold text-gold-500 mb-4">Agendamentos por Horário</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosAgendamentosPorHora} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis 
                  dataKey="hora" 
                  stroke="#666"
                  tick={{ fill: '#666' }}
                />
                <YAxis 
                  stroke="#666"
                  tick={{ fill: '#666' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a',
                    border: '1px solid rgba(255, 192, 0, 0.2)',
                    borderRadius: '0.5rem'
                  }}
                  formatter={(value: number) => [value, 'Agendamentos']}
                />
                <Bar 
                  dataKey="quantidade" 
                  name="Quantidade" 
                  fill="#FFC000" 
                  radius={[4, 4, 0, 0]}
                />
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