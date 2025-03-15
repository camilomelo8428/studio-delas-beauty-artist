import { useState, useEffect, useMemo } from 'react'
import { auth, supabase } from '../../lib/supabase'
import Produtos from './Produtos'
import ProdutosComponent from './Produtos'
import ListaProdutos from './ListaProdutos'
import ConfirmationModal from '../ConfirmationModal'
import { sounds } from '../../services/sounds'

export { AgendarHorario, MeusAgendamentos, Historico, MeuPerfil, Produtos, ListaProdutos }

// Interfaces
interface Agendamento {
  id: number
  data: string
  horario: string
  status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado'
  observacao?: string
  servico: {
    id: string
    nome: string
    preco: number
    descricao: string
    duracao_minutos: number
  }
  funcionario: {
    id: string
    nome: string
    cargo: 'barbeiro' | 'cabeleireiro' | 'manicure' | 'esteticista_facial' | 'esteticista_corporal' | 'maquiador' | 'designer_sobrancelhas' | 'massagista' | 'depilador' | 'admin'
    foto_url: string | null
  }
}

interface Servico {
  id: string
  nome: string
  preco: number
  duracao_minutos: number
  descricao: string
}

interface Funcionario {
  id: string
  nome: string
  email: string
  telefone: string
  foto_url: string | null
  status: boolean
  cargo: 'barbeiro' | 'cabeleireiro' | 'manicure' | 'esteticista_facial' | 'esteticista_corporal' | 'maquiador' | 'designer_sobrancelhas' | 'massagista' | 'depilador' | 'admin'
  comissao: number
  especialidades: string[]
}

interface Horario {
  id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  status: boolean
  tipo_horario: 'semanal' | 'especifico'
  data_especifica: string | null
}

interface HorarioDisponivel {
  hora: string
  disponivel: boolean
  motivo?: string
  profissional?: string
  servico?: string
}

interface Props {
  onClose: () => void
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

// Função para formatar o telefone enquanto digita
const formatarTelefoneInput = (telefone: string) => {
  // Remove tudo que não for número
  let numeros = telefone.replace(/\D/g, '')
  
  // Limita a 11 dígitos
  numeros = numeros.slice(0, 11)
  
  // Formata conforme vai digitando
  if (numeros.length > 2) {
    numeros = `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
  }
  if (numeros.length > 9) {
    numeros = `${numeros.slice(0, 9)}-${numeros.slice(9)}`
  }
  
  return numeros
}

// Componente de Agendamento
function AgendarHorario() {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [selectedProfessional, setSelectedProfessional] = useState('')
  const [servicos, setServicos] = useState<Servico[]>([])
  const [profissionais, setProfissionais] = useState<Funcionario[]>([])
  const [horarios, setHorarios] = useState<HorarioDisponivel[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [horarioSelecionadoIndisponivel, setHorarioSelecionadoIndisponivel] = useState<HorarioDisponivel | null>(null)

  useEffect(() => {
    carregarServicos()
    carregarProfissionais()
  }, [])

  useEffect(() => {
    if (selectedDate && selectedProfessional) {
      carregarHorariosDisponiveis()
    }
  }, [selectedDate, selectedProfessional])

    const carregarServicos = async () => {
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('status', true)
        .order('nome')

      if (error) throw error
      setServicos(data || [])
    } catch (err) {
      console.error('Erro ao carregar serviços:', err)
      setError('Erro ao carregar serviços')
    }
  }

  const carregarProfissionais = async () => {
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('status', true)
        .order('nome')

      if (error) throw error
      setProfissionais(data || [])
    } catch (err) {
      console.error('Erro ao carregar profissionais:', err)
      setError('Erro ao carregar profissionais')
    }
  }

  const carregarHorariosDisponiveis = async () => {
    try {
      setLoading(true)
      setError('')
      setHorarios([])

      // Validar data selecionada
      if (!selectedDate) {
        setError('Selecione uma data válida')
        return
      }

      // Converter para data e validar
      const dataObj = new Date(selectedDate + 'T00:00:00')
      if (isNaN(dataObj.getTime())) {
        setError('Data inválida')
        return
      }

      // Obter dia da semana (0-6)
      const diaSemana = dataObj.getDay()

      // Construir query com parâmetros nomeados para evitar injeção SQL
      const { data: horariosFunc, error: errorHorarios } = await supabase
        .from('horarios')
        .select('*')
        .eq('status', true)
        .or('dia_semana.eq.' + diaSemana + ',and(tipo_horario.eq.especifico,data_especifica.eq.' + selectedDate + ')')

      if (errorHorarios) throw errorHorarios

      if (!horariosFunc || horariosFunc.length === 0) {
        setError('Não há horários disponíveis nesta data')
        return
      }

      // 2. Buscar agendamentos existentes para o profissional na data selecionada
      const { data: agendamentosExistentes, error: errorAgendamentos } = await supabase
        .from('agendamentos')
        .select('*, servico:servicos(duracao_minutos)')
        .eq('funcionario_id', selectedProfessional)
        .eq('data', selectedDate)
        .neq('status', 'cancelado')

      if (errorAgendamentos) throw errorAgendamentos

      // 3. Gerar slots de horários disponíveis
      const horariosDisponiveis: HorarioDisponivel[] = []
      const intervaloMinutos = 30

      horariosFunc.forEach(horario => {
        if ((horario.tipo_horario === 'semanal' && horario.dia_semana === diaSemana) ||
            (horario.tipo_horario === 'especifico' && horario.data_especifica === selectedDate)) {
          
          const [horaInicio, minutoInicio] = horario.hora_inicio.split(':').map(Number)
          const [horaFim, minutoFim] = horario.hora_fim.split(':').map(Number)
          
          let currentTime = new Date(selectedDate)
          currentTime.setHours(horaInicio, minutoInicio, 0)
          
          const endTime = new Date(selectedDate)
          endTime.setHours(horaFim, minutoFim, 0)

          while (currentTime < endTime) {
            const timeString = currentTime.toTimeString().slice(0, 5)
            
            // Verificar se há conflito com agendamentos existentes
            const agendamentoExistente = agendamentosExistentes?.find(agendamento => {
              const agendamentoInicio = new Date(`${selectedDate}T${agendamento.horario}`)
              const agendamentoFim = new Date(agendamentoInicio.getTime() + (agendamento.servico.duracao_minutos * 60000))
              const slotInicio = new Date(`${selectedDate}T${timeString}`)
              const slotFim = new Date(slotInicio.getTime() + intervaloMinutos * 60000)
              
              // Verifica se há sobreposição entre os intervalos
              return (
                (slotInicio >= agendamentoInicio && slotInicio < agendamentoFim) ||
                (slotFim > agendamentoInicio && slotFim <= agendamentoFim) ||
                (slotInicio <= agendamentoInicio && slotFim >= agendamentoFim)
              )
            })

            // Verificar se o horário já passou (apenas para hoje)
            const agora = new Date()
            const isToday = selectedDate === agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-')
            const horarioAtual = new Date(`${selectedDate}T${timeString}`)
            const isPast = isToday && horarioAtual <= agora

            // Definir status e motivo do horário
            const disponivel = !isPast && !agendamentoExistente
            const motivo = isPast 
              ? 'Horário já passou' 
              : agendamentoExistente 
                ? `Horário ocupado: ${agendamentoExistente.servico.nome} (${agendamentoExistente.servico.duracao_minutos} min)`
                : undefined

            horariosDisponiveis.push({ 
              hora: timeString, 
              disponivel, 
              motivo,
              profissional: agendamentoExistente?.funcionario?.nome,
              servico: agendamentoExistente?.servico?.nome
            })
            currentTime = new Date(currentTime.getTime() + intervaloMinutos * 60000)
          }
        }
      })

      setHorarios(horariosDisponiveis.sort((a, b) => a.hora.localeCompare(b.hora)))
    } catch (err) {
      console.error('Erro ao carregar horários:', err)
      setError('Erro ao carregar horários disponíveis')
      sounds.play('erro')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime) {
      setError('Por favor, preencha todos os campos')
      sounds.play('erro')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Verificar se o horário ainda está disponível
      const horarioSelecionado = horarios.find(h => h.hora === selectedTime)
      
      if (!horarioSelecionado?.disponivel) {
        setError('Este horário não está mais disponível')
        setHorarioSelecionadoIndisponivel(horarioSelecionado || null)
        sounds.play('erro')
        return
      }

      // Obter dados do usuário logado
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        throw new Error('Usuário não autenticado')
      }

      // Criar o agendamento
      const { error: agendamentoError } = await supabase
        .from('agendamentos')
        .insert([
          {
            cliente_id: session.user.id,
            funcionario_id: selectedProfessional,
            servico_id: selectedService,
            data: selectedDate,
            horario: selectedTime,
            status: 'pendente'
          }
        ])

      if (agendamentoError) throw agendamentoError

      // Tocar som de sucesso
      sounds.play('agendamento-cliente')
      
      setSuccess(true)
      setSelectedService('')
      setSelectedProfessional('')
      setSelectedDate('')
      setSelectedTime('')
      
      // Limpar sucesso após 3 segundos
      setTimeout(() => {
        setSuccess(false)
      }, 3000)

    } catch (err) {
      console.error('Erro ao criar agendamento:', err)
      setError('Erro ao criar agendamento. Tente novamente.')
      sounds.play('erro')
    } finally {
      setLoading(false)
    }
  }

  const handleServicoChange = (servicoId: string) => {
    setSelectedService(servicoId)
    sounds.play('click')
  }

  const handleProfissionalChange = (profissionalId: string) => {
    setSelectedProfessional(profissionalId)
    sounds.play('click')
  }

  const handleDataChange = async (data: string) => {
    setSelectedDate(data)
    sounds.play('click')
    await carregarHorariosDisponiveis()
  }

  const handleHorarioChange = (horario: string) => {
    setSelectedTime(horario)
    sounds.play('click')
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-red-500 mb-6">Agendar Horário</h2>
      
      {success ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <p className="text-green-400">Agendamento realizado com sucesso!</p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Fazer Novo Agendamento
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Serviço</label>
          <select
            value={selectedService}
            onChange={(e) => handleServicoChange(e.target.value)}
                className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
            required
          >
            <option value="">Selecione um serviço</option>
                {servicos.map(servico => (
              <option key={servico.id} value={servico.id}>
                    {servico.nome} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(servico.preco)}
              </option>
            ))}
          </select>
        </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Profissional</label>
          <select
                value={selectedProfessional}
                onChange={(e) => {
                  handleProfissionalChange(e.target.value)
                  setSelectedTime('')
                }}
                className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
            required
          >
                <option value="">Selecione um profissional</option>
                {profissionais.map((profissional) => (
                  <option key={profissional.id} value={profissional.id}>
                    {profissional.nome} - {CARGO_LABELS[profissional.cargo] || profissional.cargo}
                  </option>
            ))}
          </select>
            </div>
        </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Data</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDataChange(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Horário</label>
            <div className="mb-4 flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#2a2a2a]"></div>
                <span className="text-sm text-gray-400">Disponível</span>
          </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-600"></div>
                <span className="text-sm text-gray-400">Indisponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-600"></div>
                <span className="text-sm text-gray-400">Selecionado</span>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-600"></div>
              </div>
            ) : horarios.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {horarios.map((horario, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      if (horario.disponivel) {
                        handleHorarioChange(horario.hora)
                      } else {
                        setHorarioSelecionadoIndisponivel(horario)
                      }
                    }}
                    className={`
                      group relative p-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${!horario.disponivel
                        ? 'bg-red-600/20 text-white cursor-help border border-red-600/30'
                        : selectedTime === horario.hora
                          ? 'bg-green-600 text-white shadow-lg scale-105'
                          : 'bg-[#2a2a2a] text-white hover:bg-green-600/20'
                      }
                    `}
                  >
                    {horario.hora}
                    {!horario.disponivel && (
                      <>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-[#1a1a1a] animate-pulse"></div>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] p-2 bg-[#1a1a1a] border border-red-600/30 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <div className="text-xs text-gray-400 space-y-1">
                            {horario.motivo && (
                              <p className="font-medium text-red-500">{horario.motivo}</p>
                            )}
                            {horario.profissional && (
                              <p>Profissional: <span className="text-white">{horario.profissional}</span></p>
                            )}
                            {horario.servico && (
                              <p>Serviço: <span className="text-white">{horario.servico}</span></p>
                            )}
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 border-4 border-transparent border-t-[#1a1a1a]"></div>
                        </div>
                      </>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Nenhum horário disponível nesta data</p>
            )}
          </div>

        <button 
          type="submit"
            disabled={loading || !selectedDate || !selectedTime || !selectedService || !selectedProfessional}
            onMouseEnter={() => sounds.play('hover')}
            className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-lg hover:from-red-700 hover:to-red-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {loading ? 'Confirmando...' : 'Confirmar Agendamento'}
        </button>
      </form>
      )}

      {/* Modal de Horário Indisponível */}
      <ConfirmationModal
        isOpen={!!horarioSelecionadoIndisponivel}
        onClose={() => setHorarioSelecionadoIndisponivel(null)}
        onConfirm={() => setHorarioSelecionadoIndisponivel(null)}
        title="Horário Indisponível"
        message={
          <div className="space-y-4">
            <p className="text-gray-400">
              O horário {horarioSelecionadoIndisponivel?.hora} não está disponível.
            </p>
            <p className="text-gray-400">
              Motivo: {horarioSelecionadoIndisponivel?.motivo}
            </p>
            {horarioSelecionadoIndisponivel?.profissional && (
              <p className="text-gray-400">
                Profissional: {horarioSelecionadoIndisponivel.profissional}
              </p>
            )}
            <p className="text-gray-400">
              Por favor, selecione outro horário disponível.
            </p>
          </div>
        }
        confirmText="Entendi"
        cancelText={undefined}
        type="warning"
      />
    </div>
  )
}

// Componente de Agendamentos
function MeusAgendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [agendamentoCancelamento, setAgendamentoCancelamento] = useState<Agendamento | null>(null)

  useEffect(() => {
    carregarAgendamentos()
  }, [])

  const carregarAgendamentos = async () => {
    try {
      setLoading(true)
      setError('')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setError('Usuário não autenticado')
        return
      }

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          servico:servicos(*),
          funcionario:funcionarios(*)
        `)
        .eq('cliente_id', session.user.id)
        .order('data', { ascending: true })
        .order('horario', { ascending: true })

      if (error) throw error
      setAgendamentos(data || [])
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err)
      setError('Não foi possível carregar seus agendamentos')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelarAgendamento = async (agendamentoId: number) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'cancelado' })
        .eq('id', agendamentoId)

      if (error) throw error

      // Som de cancelamento
      sounds.play('delete')
      
      // Recarregar agendamentos
      await carregarAgendamentos()
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error)
      sounds.play('erro')
    }
  }

  const handleCancelarClick = (agendamento: Agendamento) => {
    setAgendamentoCancelamento(agendamento)
    sounds.play('modal-open')
  }

  const handleConfirmarCancelamento = async () => {
    if (agendamentoCancelamento) {
      await handleCancelarAgendamento(agendamentoCancelamento.id)
      setAgendamentoCancelamento(null)
      sounds.play('modal-close')
    }
  }

  const handleCancelarCancelamento = () => {
    setAgendamentoCancelamento(null)
    sounds.play('modal-close')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-red-500 mb-6">Meus Agendamentos</h2>
      
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-500">{error}</p>
        </div>
      )}
      
      {agendamentos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Você não possui agendamentos.</p>
        </div>
      ) : (
      <div className="space-y-4">
        {agendamentos.map((agendamento) => (
          <div
            key={agendamento.id}
            className="bg-[#2a2a2a] p-4 rounded-lg border border-red-600/20 hover:border-red-600/40 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{agendamento.servico.nome}</h3>
                  <p className="text-gray-400">Data: {new Date(agendamento.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                    timeZone: 'America/Sao_Paulo'
                  })}</p>
                <p className="text-gray-400">Horário: {agendamento.horario}</p>
                  <p className="text-gray-400">Profissional: {agendamento.funcionario.nome}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  agendamento.status === 'pendente'
                  ? 'bg-blue-500/20 text-blue-400'
                  : agendamento.status === 'concluido'
                  ? 'bg-green-500/20 text-green-400'
                    : agendamento.status === 'cancelado'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {agendamento.status.toUpperCase()}
              </span>
            </div>
            
              {agendamento.status === 'pendente' && (
                <button 
                  onClick={() => handleCancelarClick(agendamento)}
                  onMouseEnter={() => sounds.play('hover')}
                  disabled={loading}
                  className="mt-4 w-full bg-red-600/20 text-red-500 border border-red-600/20 py-2 rounded hover:bg-red-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Cancelando...' : 'Cancelar Agendamento'}
              </button>
            )}
          </div>
        ))}
      </div>
      )}

      {/* Modal de Confirmação de Cancelamento */}
      {agendamentoCancelamento && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] p-6 rounded-lg w-full max-w-md relative border border-red-600/30 animate-fadeIn">
            <div className="absolute top-4 right-4">
              <button
                onClick={handleCancelarCancelamento}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600/20 text-red-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Confirmar Cancelamento</h3>
              <p className="text-gray-400">Tem certeza que deseja cancelar este agendamento?</p>
            </div>

            <div className="bg-[#2a2a2a] p-4 rounded-lg mb-6">
              <div className="space-y-2">
                <p className="text-gray-400">
                  <span className="text-gray-500">Serviço:</span>{' '}
                  {agendamentoCancelamento.servico.nome}
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">Data:</span>{' '}
                  {new Date(agendamentoCancelamento.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                    timeZone: 'America/Sao_Paulo'
                  })}
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">Horário:</span>{' '}
                  {agendamentoCancelamento.horario}
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">Profissional:</span>{' '}
                  {agendamentoCancelamento.funcionario.nome}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirmarCancelamento}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
              <button
                onClick={handleCancelarCancelamento}
                disabled={loading}
                className="flex-1 border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente de Histórico
function Historico() {
  const [historico, setHistorico] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroServico, setFiltroServico] = useState('')
  const [servicos, setServicos] = useState<Servico[]>([])
  const [detalhesAgendamento, setDetalhesAgendamento] = useState<Agendamento | null>(null)

  useEffect(() => {
    carregarHistorico()
    carregarServicos()
  }, [])

  const carregarHistorico = async () => {
    try {
      setLoading(true)
      setError('')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setError('Usuário não autenticado')
        return
      }

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          servico:servicos(*),
          funcionario:funcionarios(*)
        `)
        .eq('cliente_id', session.user.id)
        .eq('status', 'concluido')
        .order('data', { ascending: false })
        .order('horario', { ascending: false })

      if (error) throw error
      setHistorico(data || [])
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
      setError('Não foi possível carregar seu histórico')
    } finally {
      setLoading(false)
    }
  }

  const carregarServicos = async () => {
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('status', true)
        .order('nome')

      if (error) throw error
      setServicos(data || [])
    } catch (err) {
      console.error('Erro ao carregar serviços:', err)
    }
  }

  const historicoFiltrado = useMemo(() => {
    return historico.filter(item => {
      const mesMatch = !filtroMes || item.data.startsWith(filtroMes)
      const servicoMatch = !filtroServico || item.servico.id === filtroServico
      return mesMatch && servicoMatch
    })
  }, [historico, filtroMes, filtroServico])

  const handleAgendarNovamente = async (agendamento: Agendamento) => {
    try {
      // Redirecionar para a tela de agendamento com os dados pré-preenchidos
      // Implementar lógica de navegação aqui
      sounds.play('sucesso')
    } catch (err) {
      console.error('Erro ao agendar novamente:', err)
      sounds.play('erro')
    }
  }

  const formatarPreco = (preco: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco)
  }

  const handleFiltroChange = (tipo: string, valor: string) => {
    if (tipo === 'mes') {
      setFiltroMes(valor)
    } else {
      setFiltroServico(valor)
    }
    sounds.play('filter-change')
  }

  const handleDetalhesClick = (agendamento: Agendamento) => {
    setDetalhesAgendamento(agendamento)
    sounds.play('modal-open')
  }

  const handleFecharDetalhes = () => {
    setDetalhesAgendamento(null)
    sounds.play('modal-close')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-red-500 mb-6">Histórico de Serviços</h2>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-500">{error}</p>
          <button
            onClick={carregarHistorico}
            className="mt-2 text-red-500 hover:text-red-400 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Filtrar por Mês</label>
              <input
                type="month"
                value={filtroMes}
                onChange={e => handleFiltroChange('mes', e.target.value)}
                className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Filtrar por Serviço</label>
              <select
                value={filtroServico}
                onChange={e => handleFiltroChange('servico', e.target.value)}
                className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              >
                <option value="">Todos os serviços</option>
                {servicos.map(servico => (
                  <option key={servico.id} value={servico.id}>
                    {servico.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de Agendamentos */}
          {historicoFiltrado.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Nenhum serviço encontrado no histórico.</p>
            </div>
          ) : (
      <div className="space-y-4">
              {historicoFiltrado.map((item) => (
          <div
            key={item.id}
                  className="bg-[#2a2a2a] p-4 rounded-lg border border-red-600/20 hover:border-red-600/40 transition-all duration-300"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">{item.servico.nome}</h3>
                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                          Concluído
                        </span>
              </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <p className="text-gray-400">
                          <span className="text-gray-500">Data:</span>{' '}
                          {new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                            timeZone: 'America/Sao_Paulo'
                          })}
                        </p>
                        <p className="text-gray-400">
                          <span className="text-gray-500">Horário:</span>{' '}
                          {item.horario}
                        </p>
                        <p className="text-gray-400">
                          <span className="text-gray-500">Profissional:</span>{' '}
                          {item.funcionario.nome}
                        </p>
                        <p className="text-gray-400">
                          <span className="text-gray-500">Valor:</span>{' '}
                          {formatarPreco(item.servico.preco)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleDetalhesClick(item)}
                        className="flex-1 sm:flex-none bg-[#1a1a1a] hover:bg-[#2f2f2f] text-gray-400 hover:text-white px-4 py-2 rounded-lg transition-colors text-sm"
                      >
                        Ver Detalhes
                      </button>
                      <button
                        onClick={() => handleAgendarNovamente(item)}
                        className="flex-1 sm:flex-none bg-red-600/20 hover:bg-red-600/30 text-red-500 px-4 py-2 rounded-lg transition-colors text-sm"
                      >
                Agendar Novamente
              </button>
                    </div>
            </div>
          </div>
        ))}
      </div>
          )}
        </>
      )}

      {/* Modal de Detalhes */}
      {detalhesAgendamento && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] p-6 rounded-lg w-full max-w-2xl relative border border-red-600/30">
            <button
              onClick={handleFecharDetalhes}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-red-500 mb-6">Detalhes do Agendamento</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Serviço</h4>
                <div className="space-y-2">
                  <p className="text-gray-400">
                    <span className="text-gray-500">Nome:</span>{' '}
                    {detalhesAgendamento.servico.nome}
                  </p>
                  <p className="text-gray-400">
                    <span className="text-gray-500">Descrição:</span>{' '}
                    {detalhesAgendamento.servico.descricao}
                  </p>
                  <p className="text-gray-400">
                    <span className="text-gray-500">Duração:</span>{' '}
                    {detalhesAgendamento.servico.duracao_minutos} minutos
                  </p>
                  <p className="text-gray-400">
                    <span className="text-gray-500">Valor:</span>{' '}
                    {formatarPreco(detalhesAgendamento.servico.preco)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Profissional</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    {detalhesAgendamento.funcionario.foto_url ? (
                      <img
                        src={detalhesAgendamento.funcionario.foto_url}
                        alt={detalhesAgendamento.funcionario.nome}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center">
                        <span className="text-xl text-red-500">
                          {detalhesAgendamento.funcionario.nome.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">
                        {detalhesAgendamento.funcionario.nome}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {CARGO_LABELS[detalhesAgendamento.funcionario.cargo] || detalhesAgendamento.funcionario.cargo}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-red-600/20">
              <h4 className="text-lg font-semibold text-white mb-4">Agendamento</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-gray-400">
                  <span className="text-gray-500">Data:</span>{' '}
                  {new Date(detalhesAgendamento.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                    timeZone: 'America/Sao_Paulo'
                  })}
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">Horário:</span>{' '}
                  {detalhesAgendamento.horario}
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">Status:</span>{' '}
                  <span className="text-green-400">Concluído</span>
                </p>
                {detalhesAgendamento.observacao && (
                  <p className="text-gray-400 sm:col-span-2">
                    <span className="text-gray-500">Observações:</span>{' '}
                    {detalhesAgendamento.observacao}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => handleAgendarNovamente(detalhesAgendamento)}
                className="bg-red-600/20 hover:bg-red-600/30 text-red-500 px-6 py-2 rounded-lg transition-colors"
              >
                Agendar Novamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente de Perfil
function MeuPerfil() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [showSenhaModal, setShowSenhaModal] = useState(false)
  const [senhaTemp, setSenhaTemp] = useState('')
  const [confirmarSenhaTemp, setConfirmarSenhaTemp] = useState('')
  
  const [dadosPerfil, setDadosPerfil] = useState({
    nome: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    genero: '',
    cpf: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    foto_url: '',
    observacoes: ''
  })

  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  const estados = [
    { value: 'AC', label: 'Acre' },
    { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' },
    { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' },
    { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' },
    { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' },
    { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' }
  ]

  const formatarCPF = (cpf: string) => {
    const numeros = cpf.replace(/\D/g, '')
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatarCEP = (cep: string) => {
    const numeros = cep.replace(/\D/g, '')
    return numeros.replace(/(\d{5})(\d{3})/, '$1-$2')
  }

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true)
      try {
      const { cliente } = await auth.getClienteAtual()
      if (cliente) {
          setDadosPerfil({
            nome: cliente.nome || '',
            email: cliente.email || '',
            telefone: cliente.telefone || '',
            data_nascimento: cliente.data_nascimento || '',
            genero: cliente.genero || '',
            cpf: cliente.cpf || '',
            endereco: cliente.endereco || '',
            bairro: cliente.bairro || '',
            cidade: cliente.cidade || '',
            estado: cliente.estado || '',
            cep: cliente.cep || '',
            foto_url: cliente.foto_url || '',
            observacoes: cliente.observacoes || ''
          })
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        setError('Erro ao carregar seus dados. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    carregarDados()
  }, [])

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    
    setUploadingFoto(true)
    try {
      const file = e.target.files[0]
      const fileName = `${Date.now()}-${file.name}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('clientes')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('clientes')
        .getPublicUrl(fileName)

      setDadosPerfil(prev => ({ ...prev, foto_url: urlData.publicUrl }))
      sounds.play('sucesso')
    } catch (err) {
      console.error('Erro ao fazer upload:', err)
      sounds.play('erro')
    } finally {
      setUploadingFoto(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Usuário não autenticado')

      // Atualiza os dados do cliente
      const { error: updateError } = await supabase
        .from('clientes')
        .update({
          nome: dadosPerfil.nome,
          telefone: dadosPerfil.telefone,
          data_nascimento: dadosPerfil.data_nascimento || null,
          genero: dadosPerfil.genero,
          cpf: dadosPerfil.cpf,
          endereco: dadosPerfil.endereco,
          bairro: dadosPerfil.bairro,
          cidade: dadosPerfil.cidade,
          estado: dadosPerfil.estado,
          cep: dadosPerfil.cep,
          foto_url: dadosPerfil.foto_url,
          observacoes: dadosPerfil.observacoes
        })
        .eq('id', session.user.id)

      if (updateError) throw updateError

      // Se houver nova senha, atualiza
      if (senha) {
        if (senha !== confirmarSenha) {
          throw new Error('As senhas não conferem')
        }
        const { error: passwordError } = await supabase.auth.updateUser({
          password: senha
        })
        if (passwordError) throw passwordError
      }

      setSuccess(true)
      setSenha('')
      setConfirmarSenha('')
    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err)
      setError(err.message || 'Erro ao atualizar perfil. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSenhaSubmit = async () => {
    if (senhaTemp !== confirmarSenhaTemp) {
      setError('As senhas não conferem')
      return
    }

    if (senhaTemp.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    try {
      setLoading(true)
      const { error: passwordError } = await supabase.auth.updateUser({
        password: senhaTemp
      })
      if (passwordError) throw passwordError

      setSenha('')
      setConfirmarSenha('')
      setSenhaTemp('')
      setConfirmarSenhaTemp('')
      setShowSenhaModal(false)
      setSuccess(true)
      sounds.play('sucesso')
    } catch (err: any) {
      console.error('Erro ao atualizar senha:', err)
      setError(err.message || 'Erro ao atualizar senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !dadosPerfil.nome) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-red-500 mb-6">Meu Perfil</h2>
      
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <p className="text-green-500 text-sm">Perfil atualizado com sucesso!</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Foto de Perfil */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {dadosPerfil.foto_url ? (
              <img
                src={dadosPerfil.foto_url}
                alt="Foto de perfil"
                className="w-32 h-32 rounded-full object-cover border-4 border-red-600/20"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-red-600/20 flex items-center justify-center border-4 border-red-600/20">
                <span className="text-3xl text-red-500">
                  {dadosPerfil.nome.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-red-600 text-white p-2 rounded-full cursor-pointer hover:bg-red-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadFoto}
                className="hidden"
                disabled={uploadingFoto}
              />
            </label>
          </div>
          {uploadingFoto && (
            <p className="text-sm text-gray-400">Fazendo upload...</p>
          )}
        </div>

        {/* Dados Pessoais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Nome Completo</label>
          <input
            type="text"
              value={dadosPerfil.nome}
              onChange={e => setDadosPerfil(prev => ({ ...prev, nome: e.target.value }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              required
          />
        </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">E-mail</label>
          <input
            type="email"
              value={dadosPerfil.email}
              disabled
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-gray-400 cursor-not-allowed"
          />
        </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Telefone</label>
          <input
            type="tel"
              value={dadosPerfil.telefone}
              onChange={e => setDadosPerfil(prev => ({ ...prev, telefone: formatarTelefoneInput(e.target.value) }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              placeholder="(91) 99999-9999"
              required
          />
        </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">CPF</label>
            <input
              type="text"
              value={dadosPerfil.cpf}
              onChange={e => setDadosPerfil(prev => ({ ...prev, cpf: formatarCPF(e.target.value) }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Data de Nascimento</label>
            <input
              type="date"
              value={dadosPerfil.data_nascimento}
              onChange={e => setDadosPerfil(prev => ({ ...prev, data_nascimento: e.target.value }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Gênero</label>
            <select
              value={dadosPerfil.genero}
              onChange={e => setDadosPerfil(prev => ({ ...prev, genero: e.target.value }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
            >
              <option value="">Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
              <option value="prefiro_nao_informar">Prefiro não informar</option>
            </select>
          </div>
        </div>

        {/* Endereço */}
        <div className="pt-6 border-t border-red-600/10">
          <h3 className="text-lg font-semibold text-red-500 mb-4">Endereço</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-gray-400 text-sm mb-2">Endereço</label>
              <input
                type="text"
                value={dadosPerfil.endereco}
                onChange={e => setDadosPerfil(prev => ({ ...prev, endereco: e.target.value }))}
                className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                placeholder="Rua, número, complemento"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Bairro</label>
              <input
                type="text"
                value={dadosPerfil.bairro}
                onChange={e => setDadosPerfil(prev => ({ ...prev, bairro: e.target.value }))}
                className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">CEP</label>
              <input
                type="text"
                value={dadosPerfil.cep}
                onChange={e => setDadosPerfil(prev => ({ ...prev, cep: formatarCEP(e.target.value) }))}
                className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                placeholder="00000-000"
              />
          </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Cidade</label>
              <input
                type="text"
                value={dadosPerfil.cidade}
                onChange={e => setDadosPerfil(prev => ({ ...prev, cidade: e.target.value }))}
                className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              />
        </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Estado</label>
              <select
                value={dadosPerfil.estado}
                onChange={e => setDadosPerfil(prev => ({ ...prev, estado: e.target.value }))}
                className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              >
                <option value="">Selecione</option>
                {estados.map(estado => (
                  <option key={estado.value} value={estado.value}>
                    {estado.label}
                  </option>
                ))}
              </select>
    </div>
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-gray-400 text-sm mb-2">Observações</label>
          <textarea
            value={dadosPerfil.observacoes}
            onChange={e => setDadosPerfil(prev => ({ ...prev, observacoes: e.target.value }))}
            className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
            rows={3}
            placeholder="Observações adicionais (opcional)"
          />
        </div>

        {/* Alterar Senha */}
        <div className="pt-6 border-t border-red-600/10">
          <h3 className="text-lg font-semibold text-red-500 mb-4">Alterar Senha</h3>
          
          <button
            onClick={() => setShowSenhaModal(true)}
            className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white hover:bg-red-600/10 transition-colors text-left"
          >
            Clique aqui para alterar sua senha
          </button>
        </div>

        {/* Modal de Alteração de Senha */}
        <ConfirmationModal
          isOpen={showSenhaModal}
          onClose={() => {
            setShowSenhaModal(false)
            setSenhaTemp('')
            setConfirmarSenhaTemp('')
            setError('')
          }}
          onConfirm={handleSenhaSubmit}
          title="Alterar Senha"
          message={
            <div className="space-y-4">
              <p className="text-gray-400">Digite sua nova senha:</p>
              
              <div className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={senhaTemp}
                    onChange={(e) => setSenhaTemp(e.target.value)}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    placeholder="Nova senha"
              />
            </div>
            
                <div>
                  <input
                    type="password"
                    value={confirmarSenhaTemp}
                    onChange={(e) => setConfirmarSenhaTemp(e.target.value)}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    placeholder="Confirme a nova senha"
                  />
              </div>

                {error && (
                  <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    {error}
            </div>
                )}
          </div>
      </div>
          }
          confirmText="Alterar Senha"
          cancelText="Cancelar"
          type="warning"
          isLoading={loading}
        />

        <button
          type="submit"
          onMouseEnter={() => sounds.play('hover')}
          disabled={loading || uploadingFoto}
          className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-lg hover:from-red-700 hover:to-red-900 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  )
}