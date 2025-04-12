import { useState, useEffect, useCallback } from 'react'
import { useAgendamentos } from '../../hooks/useAdmin'
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
import { useRealtimeAgendamentos } from '../../hooks/useRealtimeAgendamentos'

const hoje = format(toZonedTime(new Date(), 'America/Sao_Paulo'), 'yyyy-MM-dd')

interface Servico {
  id: string;
  nome: string;
  preco: number;
  preco_promocional?: number;
  promocao_ativa?: boolean;
  duracao_minutos: number;
  preco_efetivo?: number;
  preco_original?: number;
  em_promocao?: boolean;
}

interface Cliente {
  id: string;
  nome: string;
}

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
}

interface Agendamento {
  id: string;
  cliente_id: string;
  funcionario_id: string;
  servico_id: string;
  data: string;
  horario: string;
  status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado';
  servico: Servico;
  funcionario: Funcionario;
  cliente: Cliente;
}

interface DadosLucro {
  data: string;
  lucroTotal: number;
  totalServicos: number;
}

interface Estatisticas {
  pendentes: number;
  confirmados: number;
  concluidos: number;
  cancelados: number;
  total: number;
}

interface Resumo {
  lucroTotal: number;
  totalServicos: number;
  mediaTicket: number;
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
  const [configEmpresa, setConfigEmpresa] = useState<any>({
    nome_empresa: '',
    logo_url: null,
    telefone: '',
    email: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    horario_funcionamento: '',
    instagram: '',
    facebook: '',
    whatsapp: ''
  })

  // Dados para os gráficos
  const [dadosFaturamento, setDadosFaturamento] = useState<any[]>([])
  const [dadosAgendamentosPorStatus, setDadosAgendamentosPorStatus] = useState<any[]>([])
  const [dadosAgendamentosPorHora, setDadosAgendamentosPorHora] = useState<any[]>([])
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'hoje' | '7dias' | 'mes'>('hoje')

  // Carregar configurações da empresa
  useEffect(() => {
    const carregarConfiguracoes = async () => {
      try {
        const { data: configData, error: configError } = await supabase
          .from('configuracoes')
          .select('*')
          .single()

        if (configError) throw configError
        setConfigEmpresa(configData)
      } catch (err) {
        console.error('Erro ao carregar configurações:', err)
      }
    }
    carregarConfiguracoes()
  }, [])

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Formatar datas para o formato YYYY-MM-DD
      const dataInicialFormatada = new Date(dataInicial).toISOString().split('T')[0]
      const dataFinalFormatada = new Date(dataFinal).toISOString().split('T')[0]

      console.log('Buscando agendamentos:', { dataInicialFormatada, dataFinalFormatada })

      const { data: agendamentosData, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes(nome),
          funcionario:funcionarios(nome),
          servico:servicos(nome, preco, preco_promocional, promocao_ativa),
          valor_pago,
          valor_original,
          em_promocao
        `)
        .gte('data', dataInicialFormatada)
        .lte('data', dataFinalFormatada)

      if (error) throw error

      // Buscar histórico de valores dos serviços
      const { data: historicoValores, error: historicoError } = await supabase
        .from('historico_valores_servicos')
        .select('*')
        .gte('data_alteracao', dataInicialFormatada)
        .lte('data_alteracao', dataFinalFormatada)

      if (historicoError) throw historicoError

      // Mapear o histórico de valores por serviço e data
      const mapaHistoricoValores = new Map()
      historicoValores?.forEach(historico => {
        const chave = `${historico.servico_id}_${historico.data_alteracao}`
        mapaHistoricoValores.set(chave, {
          preco: historico.preco,
          preco_promocional: historico.preco_promocional,
          promocao_ativa: historico.promocao_ativa
        })
      })

      // Processar agendamentos com valores históricos
      const agendamentosProcessados = agendamentosData?.map(agendamento => {
        // Se o agendamento já tem valores salvos, usar eles
        if (agendamento.valor_pago !== null && agendamento.valor_original !== null) {
          return {
            ...agendamento,
            servico: {
              ...agendamento.servico,
              preco_efetivo: agendamento.valor_pago,
              preco_original: agendamento.valor_original,
              em_promocao: agendamento.em_promocao
            }
          }
        }

        // Procurar valor histórico mais próximo
        const dataAgendamento = agendamento.data
        const historicoServico = Array.from(mapaHistoricoValores.entries())
          .filter(([chave]) => chave.startsWith(agendamento.servico_id))
          .filter(([chave]) => {
            const dataHistorico = chave.split('_')[1]
            return dataHistorico <= dataAgendamento
          })
          .sort(([chaveA], [chaveB]) => chaveB.split('_')[1].localeCompare(chaveA.split('_')[1]))[0]

        if (historicoServico) {
          const [, valores] = historicoServico
          return {
            ...agendamento,
            servico: {
              ...agendamento.servico,
              preco_efetivo: valores.promocao_ativa ? valores.preco_promocional : valores.preco,
              preco_original: valores.preco,
              em_promocao: valores.promocao_ativa
            }
          }
        }

        // Se não encontrar histórico, usar valores atuais do serviço
        return {
          ...agendamento,
          servico: {
            ...agendamento.servico,
            preco_efetivo: agendamento.servico.promocao_ativa ? agendamento.servico.preco_promocional : agendamento.servico.preco,
            preco_original: agendamento.servico.preco,
            em_promocao: agendamento.servico.promocao_ativa
          }
        }
      }) || []

      setAgendamentos(agendamentosProcessados)
      calcularEstatisticas(agendamentosProcessados)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [dataInicial, dataFinal])

  // Usar o hook de Realtime
  useRealtimeAgendamentos(carregarDados)

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const calcularEstatisticas = (agendamentos: Agendamento[]) => {
    const stats = {
      pendentes: agendamentos.filter(a => a.status === 'pendente').length,
      confirmados: agendamentos.filter(a => a.status === 'confirmado').length,
      concluidos: agendamentos.filter(a => a.status === 'concluido').length,
      cancelados: agendamentos.filter(a => a.status === 'cancelado').length,
      total: agendamentos.length
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
    agendamentos
      .filter(a => a.status === 'concluido')
      .forEach(agendamento => {
        const data = format(toZonedTime(parseISO(agendamento.data), 'America/Sao_Paulo'), 'dd/MM', { locale: ptBR })
        const valorAtual = dadosFaturamentoPorDia.get(data) || 0
        const valorServico = agendamento.servico.preco_efetivo || agendamento.servico.preco
        dadosFaturamentoPorDia.set(data, valorAtual + valorServico)
      })

    const dadosFaturamentoProcessados = Array.from(dadosFaturamentoPorDia.entries())
      .map(([data, valor]) => ({ data, valor }))
      .sort((a, b) => a.data.localeCompare(b.data))

    setDadosFaturamento(dadosFaturamentoProcessados)

    // Preparar dados para o gráfico de agendamentos por hora
    const dadosPorHora = new Map<string, number>()
    agendamentos.forEach(agendamento => {
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
    
    agendamentos.forEach(agendamento => {
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
        const valorServico = agendamento.servico.preco_efetivo || agendamento.servico.preco
        
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
    .filter(a => a && a.status === 'concluido' && a.servico)
    .reduce((total, a) => {
      const valorServico = a.servico.preco_efetivo || a.servico.preco
      return total + Number(valorServico)
    }, 0)

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
        if (agendamento.status === 'concluido' && agendamento.servico?.preco_efetivo) {
          acc.faturamento += Number(agendamento.servico.preco_efetivo)
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
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      // Adicionar logo e cabeçalho
      doc.setFillColor(255, 192, 0)
      doc.rect(0, 0, doc.internal.pageSize.width, 30, 'F')
      
      // Informações do Estabelecimento
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(configEmpresa.nome_empresa, doc.internal.pageSize.width / 2, 15, { align: 'center' })
      
      doc.setFontSize(12)
      doc.text(`CNPJ: ${configEmpresa.cnpj || 'XX.XXX.XXX/0001-XX'}`, 15, 40)
      doc.text(`Endereço: ${configEmpresa.endereco}, ${configEmpresa.bairro}`, 15, 47)
      doc.text(`${configEmpresa.cidade} - ${configEmpresa.estado}, CEP: ${configEmpresa.cep}`, 15, 54)
      doc.text(`Tel: ${configEmpresa.telefone} | WhatsApp: ${configEmpresa.whatsapp}`, 15, 61)
      doc.text(`E-mail: ${configEmpresa.email}`, 15, 68)
      doc.text(`Horário: ${configEmpresa.horario_funcionamento}`, 15, 75)

      // Título do Relatório
      doc.setFontSize(16)
      doc.setTextColor(255, 192, 0)
      doc.text('Relatório Financeiro Detalhado', doc.internal.pageSize.width / 2, 90, { align: 'center' })

      // Período e Data de Geração
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const periodoText = `Período de Análise: ${format(toZonedTime(parseISO(dataInicial), 'America/Sao_Paulo'), 'dd/MM/yyyy')} a ${format(toZonedTime(parseISO(dataFinal), 'America/Sao_Paulo'), 'dd/MM/yyyy')}`
      const dataGeracaoText = `Data de Geração: ${format(toZonedTime(new Date(), 'America/Sao_Paulo'), 'dd/MM/yyyy HH:mm')}`
      doc.text(periodoText, 15, 100)
      doc.text(dataGeracaoText, doc.internal.pageSize.width - 15, 100, { align: 'right' })

      let posicaoY = 110

      // 1. Indicadores Financeiros Principais
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 192, 0)
      doc.text('1. Indicadores Financeiros Principais', 15, posicaoY)
      posicaoY += 10

      // Calcular métricas adicionais
      const totalDias = dadosLucro.length || 1
      const mediaServicosporDia = resumo.totalServicos / totalDias
      const taxaCrescimento = dadosLucro.length > 1 ? 
        ((dadosLucro[dadosLucro.length - 1].lucroTotal - dadosLucro[0].lucroTotal) / dadosLucro[0].lucroTotal) * 100 : 0

      const dadosIndicadores = [
        ['Receita Bruta Total', formatarMoeda(resumo.lucroTotal)],
        ['Média Diária de Faturamento', formatarMoeda(resumo.lucroTotal / totalDias)],
        ['Total de Serviços Realizados', resumo.totalServicos.toString()],
        ['Média de Serviços por Dia', mediaServicosporDia.toFixed(1)],
        ['Ticket Médio', formatarMoeda(resumo.mediaTicket)],
        ['Taxa de Crescimento no Período', `${taxaCrescimento.toFixed(1)}%`],
        ['Taxa de Conversão (Concluídos/Total)', `${((estatisticas.concluidos / estatisticas.total) * 100).toFixed(1)}%`]
      ]

      autoTable(doc, {
        startY: posicaoY,
        head: [['Indicador', 'Valor']],
        body: dadosIndicadores,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 192, 0],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 10
        },
        styles: {
          fontSize: 9,
          cellPadding: 5
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 50, halign: 'right' }
        }
      })

      posicaoY = (doc as any).lastAutoTable.finalY + 20

      // 2. Análise de Serviços
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 192, 0)
      doc.text('2. Análise Detalhada de Serviços', 15, posicaoY)
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
              valorOriginal: 0,
              ticketMedio: 0,
              duracaoTotal: 0,
              promocoes: 0
            }
          }
          acc[servicoNome].quantidade++
          const valorEfetivo = agendamento.servico.preco_efetivo || agendamento.servico.preco
          const valorOriginal = agendamento.servico.preco_original || agendamento.servico.preco
          acc[servicoNome].valorTotal += valorEfetivo
          acc[servicoNome].valorOriginal += valorOriginal
          acc[servicoNome].ticketMedio = acc[servicoNome].valorTotal / acc[servicoNome].quantidade
          if (agendamento.servico.em_promocao) {
            acc[servicoNome].promocoes++
          }
          acc[servicoNome].duracaoTotal += agendamento.servico.duracao_minutos
          return acc
        }, {} as Record<string, { 
          quantidade: number; 
          valorTotal: number; 
          valorOriginal: number;
          ticketMedio: number;
          duracaoTotal: number;
          promocoes: number;
        }>)

      // Preparar dados de serviços com métricas adicionais
      const dadosServicosDetalhados = Object.entries(servicosPorTipo).map(([servico, dados]) => [
        servico,
        dados.quantidade.toString(),
        formatarMoeda(dados.valorTotal),
        formatarMoeda(dados.valorOriginal),
        formatarMoeda(dados.ticketMedio),
        `${Math.floor(dados.duracaoTotal / 60)}h${dados.duracaoTotal % 60}min`,
        `${((dados.quantidade / resumo.totalServicos) * 100).toFixed(1)}%`,
        formatarMoeda(dados.valorTotal / dados.duracaoTotal * 60), // Receita por Hora
        dados.promocoes > 0 ? `${dados.promocoes} (${((dados.promocoes / dados.quantidade) * 100).toFixed(1)}%)` : 'Não'
      ])

      autoTable(doc, {
        startY: posicaoY,
        head: [
          ['Serviço', 'Qtde', 'Valor Total', 'Val. Original', 'Ticket Médio', 
           'Tempo Total', 'Part.(%)', 'Receita/Hora', 'Promoções']
        ],
        body: dadosServicosDetalhados,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 192, 0],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8,
          cellPadding: 4
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 15, halign: 'center' },
          7: { cellWidth: 25, halign: 'right' },
          8: { cellWidth: 25 }
        }
      })

      posicaoY = (doc as any).lastAutoTable.finalY + 20

      // 3. Análise por Profissional
      doc.addPage('landscape')
      posicaoY = 30
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 192, 0)
      doc.text('3. Análise por Profissional', 15, posicaoY)
      posicaoY += 10

      // Agrupar serviços por profissional
      const servicosPorProfissional = agendamentos
        .filter(a => a.status === 'concluido')
        .reduce((acc, agendamento) => {
          const profissionalNome = agendamento.funcionario.nome
          if (!acc[profissionalNome]) {
            acc[profissionalNome] = {
              cargo: agendamento.funcionario.cargo,
              atendimentos: 0,
              valorTotal: 0,
              valorOriginal: 0,
              ticketMedio: 0,
              duracaoTotal: 0,
              servicosRealizados: new Set<string>(),
              promocoes: 0
            }
          }
          acc[profissionalNome].atendimentos++
          const valorEfetivo = agendamento.servico.preco_efetivo || agendamento.servico.preco
          const valorOriginal = agendamento.servico.preco_original || agendamento.servico.preco
          acc[profissionalNome].valorTotal += valorEfetivo
          acc[profissionalNome].valorOriginal += valorOriginal
          acc[profissionalNome].ticketMedio = acc[profissionalNome].valorTotal / acc[profissionalNome].atendimentos
          if (agendamento.servico.em_promocao) {
            acc[profissionalNome].promocoes++
          }
          acc[profissionalNome].duracaoTotal += agendamento.servico.duracao_minutos
          acc[profissionalNome].servicosRealizados.add(agendamento.servico.nome)
          return acc
        }, {} as Record<string, { 
          cargo: string;
          atendimentos: number;
          valorTotal: number;
          valorOriginal: number;
          ticketMedio: number;
          duracaoTotal: number;
          servicosRealizados: Set<string>;
          promocoes: number;
        }>)

      // Preparar dados dos profissionais com métricas adicionais
      const dadosProfissionaisDetalhados = Object.entries(servicosPorProfissional).map(([profissional, dados]) => {
        const horasTrabalhadas = dados.duracaoTotal / 60
        return [
          profissional,
          dados.cargo,
          dados.atendimentos.toString(),
          formatarMoeda(dados.valorTotal),
          formatarMoeda(dados.ticketMedio),
          `${Math.floor(dados.duracaoTotal / 60)}h${dados.duracaoTotal % 60}min`,
          formatarMoeda(dados.valorTotal / horasTrabalhadas), // Produtividade (R$/hora)
          `${((dados.atendimentos / resumo.totalServicos) * 100).toFixed(1)}%`,
          Array.from(dados.servicosRealizados).join(', '),
          dados.promocoes > 0 ? `${dados.promocoes} (${((dados.promocoes / dados.atendimentos) * 100).toFixed(1)}%)` : 'Não'
        ]
      })

      autoTable(doc, {
        startY: posicaoY,
        head: [
          ['Profissional', 'Cargo', 'Atend.', 'Valor Total', 'Ticket Médio', 
           'Tempo Total', 'Produtiv.(R$/h)', 'Part.(%)', 'Serviços Realizados', 'Promoções']
        ],
        body: dadosProfissionaisDetalhados,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 192, 0],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 25 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 25, halign: 'right' },
          7: { cellWidth: 15, halign: 'center' },
          8: { cellWidth: 50 },
          9: { cellWidth: 25 }
        },
        margin: { left: 15, right: 15 }
      })

      posicaoY = (doc as any).lastAutoTable.finalY + 20

      // 4. Análise Diária
      doc.addPage('landscape')
      posicaoY = 30

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 192, 0)
      doc.text('4. Análise Diária Detalhada', 15, posicaoY)
      posicaoY += 10

      // Preparar dados diários com métricas adicionais
      const dadosDiariosDetalhados = dadosLucro.map(dado => {
        const servicosDia = dado.totalServicos || 1
        const ticketMedioDia = dado.lucroTotal / servicosDia
        return [
          dado.data,
          formatarMoeda(dado.lucroTotal),
          servicosDia.toString(),
          formatarMoeda(ticketMedioDia),
          `${((dado.lucroTotal / resumo.lucroTotal) * 100).toFixed(1)}%`,
          `${((servicosDia / resumo.totalServicos) * 100).toFixed(1)}%`
        ]
      })

      autoTable(doc, {
        startY: posicaoY,
        head: [
          ['Data', 'Faturamento', 'Qtde Serviços', 'Ticket Médio', 
           'Part. Fatur.(%)', 'Part. Serviços(%)']
        ],
        body: dadosDiariosDetalhados,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 192, 0],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8,
          cellPadding: 4
        },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center' },
          1: { cellWidth: 30, halign: 'right' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 25, halign: 'center' }
        },
        margin: { left: 15, right: 15 }
      })

      // Rodapé em todas as páginas
      const numPages = doc.getNumberOfPages()
      for (let i = 1; i <= numPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(
          `Página ${i} de ${numPages}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        )
        doc.text(
          'Documento Confidencial - Uso Interno',
          15,
          doc.internal.pageSize.height - 10
        )
        doc.text(
          `Gerado em: ${format(toZonedTime(new Date(), 'America/Sao_Paulo'), 'dd/MM/yyyy HH:mm')}`,
          doc.internal.pageSize.width - 15,
          doc.internal.pageSize.height - 10,
          { align: 'right' }
        )
      }

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
          <div className="absolute inset-0 rounded-full border-4 border-pink-600/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-pink-600 border-t-transparent animate-spin"></div>
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
        <h2 className="text-2xl font-bold text-pink-500">Dashboard</h2>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <label className="text-sm text-gray-400">Data Inicial</label>
              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className="bg-[#1a1a1a] border border-pink-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-600/40"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-400">Data Final</label>
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className="bg-[#1a1a1a] border border-pink-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-600/40"
              />
            </div>
            <button
              onClick={handlePeriodoChange}
              className="mt-6 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
            >
              Filtrar
            </button>
          </div>
          
          <button
            onClick={gerarRelatorioPDF}
            className="px-4 py-2 bg-pink-600/20 text-pink-500 rounded-lg hover:bg-pink-600/30 transition-colors flex items-center gap-2"
          >
            <span>📊</span>
            Gerar Relatório PDF
          </button>
          </div>
        </div>

      {/* Estatísticas do Dia */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-pink-600/20">
          <h3 className="text-lg font-semibold text-pink-500 mb-4">Agendamentos Hoje</h3>
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
            <div className="pt-2 border-t border-pink-600/10">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total:</span>
                <span className="text-pink-500 font-semibold">{estatisticas.total}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-pink-600/20">
          <h3 className="text-lg font-semibold text-pink-500 mb-4">Faturamento Hoje</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Valor Total:</span>
              <span className="text-pink-500 font-semibold">{formatarMoeda(faturamentoHoje)}</span>
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

        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-pink-600/20">
          <h3 className="text-lg font-semibold text-pink-500 mb-4">Taxa de Conclusão</h3>
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
              <span className="text-pink-500 font-semibold">
            {estatisticas.total > 0 
                  ? `${((estatisticas.concluidos / estatisticas.total) * 100).toFixed(1)}%`
              : '0%'
            }
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-pink-600/20">
          <h3 className="text-lg font-semibold text-pink-500 mb-4">Resumo do Período</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Lucro Total:</span>
              <span className="text-pink-500 font-semibold">{formatarMoeda(resumo.lucroTotal)}</span>
            </div>
            <div className="pt-2 border-t border-pink-600/10">
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
        <div className="bg-[#1a1a1a] p-4 rounded-xl border border-pink-600/20">
          <h3 className="text-sm text-gray-400 mb-2">Lucro Total</h3>
          <p className="text-2xl font-bold text-pink-500">{formatarMoeda(resumo.lucroTotal)}</p>
          <p className="text-sm text-gray-400 mt-1">No período selecionado</p>
        </div>
        <div className="bg-[#1a1a1a] p-4 rounded-xl border border-pink-600/20">
          <h3 className="text-sm text-gray-400 mb-2">Total de Serviços</h3>
          <p className="text-2xl font-bold text-purple-500">{resumo.totalServicos}</p>
          <p className="text-sm text-gray-400 mt-1">Serviços realizados</p>
        </div>
        <div className="bg-[#1a1a1a] p-4 rounded-xl border border-pink-600/20">
          <h3 className="text-sm text-gray-400 mb-2">Ticket Médio</h3>
          <p className="text-2xl font-bold text-rose-500">{formatarMoeda(resumo.mediaTicket)}</p>
          <p className="text-sm text-gray-400 mt-1">Por atendimento</p>
        </div>
        <div className="bg-[#1a1a1a] p-4 rounded-xl border border-pink-600/20">
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
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-pink-600/20">
          <h3 className="text-lg font-semibold text-pink-500 mb-4">Evolução do Lucro</h3>
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
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-pink-600/20">
          <h3 className="text-lg font-semibold text-pink-500 mb-4">Comparativo</h3>
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
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-pink-600/20">
          <h3 className="text-lg font-semibold text-pink-500 mb-4">Distribuição de Status</h3>
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
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-pink-600/20">
          <h3 className="text-lg font-semibold text-pink-500 mb-4">Agendamentos por Horário</h3>
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
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-pink-600/20 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Próximos Agendamentos</h3>
          <button 
            className="text-pink-500 hover:text-pink-400 transition-colors"
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
              className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-pink-600/10"
              onMouseEnter={handleCardHover}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-600/20 flex items-center justify-center">
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