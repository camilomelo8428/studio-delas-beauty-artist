import { useState } from 'react'
import { useHorarios } from '../../hooks/useAdmin'

interface Horario {
  id: string
  dia_semana: number | null
  hora_inicio: string
  hora_fim: string
  status: boolean
  tipo_horario: 'semanal' | 'especifico'
  data_especifica: string | null
}

export default function Horarios() {
  const { 
    horarios, 
    loading, 
    error,
    adicionarHorario,
    atualizarHorario,
    excluirHorario
  } = useHorarios()

  const [modalAberto, setModalAberto] = useState(false)
  const [horarioEmEdicao, setHorarioEmEdicao] = useState<Horario | null>(null)
  
  const [novoHorario, setNovoHorario] = useState({
    dia_semana: 1,
    hora_inicio: '',
    hora_fim: '',
    status: true,
    tipo_horario: 'semanal' as 'semanal' | 'especifico',
    data_especifica: null as string | null
  })

  const diasSemana = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const horarioParaSalvar = {
        dia_semana: novoHorario.tipo_horario === 'semanal' ? parseInt(novoHorario.dia_semana.toString()) : null,
        hora_inicio: novoHorario.hora_inicio,
        hora_fim: novoHorario.hora_fim,
        status: novoHorario.status,
        tipo_horario: novoHorario.tipo_horario,
        data_especifica: novoHorario.tipo_horario === 'especifico' 
          ? novoHorario.data_especifica
          : null
      }

      console.log('Salvando horário:', horarioParaSalvar)

      if (horarioEmEdicao) {
        await atualizarHorario(horarioEmEdicao.id, horarioParaSalvar)
      } else {
        await adicionarHorario(horarioParaSalvar)
      }
      
      setModalAberto(false)
      setHorarioEmEdicao(null)
      setNovoHorario({
        dia_semana: 1,
        hora_inicio: '',
        hora_fim: '',
        status: true,
        tipo_horario: 'semanal',
        data_especifica: null
      })
    } catch (err) {
      console.error('Erro ao salvar horário:', err)
      alert('Erro ao salvar horário. Verifique o console para mais detalhes.')
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-red-500">Horários de Funcionamento</h2>
        <button 
          onClick={() => {
            setHorarioEmEdicao(null)
            setModalAberto(true)
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-900 transition-all whitespace-nowrap"
        >
          <span>+</span>
          <span>Adicionar Horário</span>
        </button>
      </div>
      
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-red-600/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-red-600/20">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Tipo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Data/Dia</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Horário</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-600/10">
              {horarios
                .sort((a, b) => {
                  // Primeiro ordena por tipo (específico primeiro)
                  if (a.tipo_horario !== b.tipo_horario) {
                    return a.tipo_horario === 'especifico' ? -1 : 1
                  }
                  // Se for específico, ordena por data
                  if (a.tipo_horario === 'especifico' && b.tipo_horario === 'especifico' && a.data_especifica && b.data_especifica) {
                    return new Date(a.data_especifica).getTime() - new Date(b.data_especifica).getTime()
                  }
                  // Se for semanal, ordena por dia da semana
                  if (a.dia_semana !== null && b.dia_semana !== null) {
                    return a.dia_semana - b.dia_semana
                  }
                  return 0
                })
                .map(horario => (
                  <tr key={horario.id} className="hover:bg-red-600/5 transition-colors">
                    <td className="px-6 py-4 text-white">
                      {horario.tipo_horario === 'especifico' ? 'Data Específica' : 'Semanal'}
                    </td>
                    <td className="px-6 py-4 text-white">
                      {horario.tipo_horario === 'especifico' && horario.data_especifica
                        ? new Date(horario.data_especifica + 'T00:00:00').toLocaleDateString('pt-BR')
                        : horario.dia_semana !== null ? diasSemana[horario.dia_semana] : ''
                      }
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {horario.hora_inicio} às {horario.hora_fim}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        horario.status 
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {horario.status ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => {
                          setHorarioEmEdicao(horario)
                          setNovoHorario({
                            dia_semana: horario.dia_semana || 1,
                            hora_inicio: horario.hora_inicio,
                            hora_fim: horario.hora_fim,
                            status: horario.status,
                            tipo_horario: horario.tipo_horario,
                            data_especifica: horario.data_especifica
                          })
                          setModalAberto(true)
                        }}
                        className="text-blue-500 hover:text-blue-400 transition-colors"
                      >
                        <span className="sm:hidden">✏️</span>
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm('Tem certeza que deseja excluir este horário?')) {
                            excluirHorario(horario.id)
                          }
                        }}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        <span className="sm:hidden">🗑️</span>
                        <span className="hidden sm:inline">Excluir</span>
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Adicionar/Editar */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] p-6 rounded-lg w-full max-w-md relative border border-red-600/30">
            <h3 className="text-xl font-bold text-red-500 mb-6">
              {horarioEmEdicao ? 'Editar Horário' : 'Novo Horário'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Tipo de Horário</label>
                <select
                  value={novoHorario.tipo_horario}
                  onChange={e => setNovoHorario(prev => ({ 
                    ...prev, 
                    tipo_horario: e.target.value as 'semanal' | 'especifico',
                    data_especifica: e.target.value === 'especifico' ? '' : null
                  }))}
                  className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                  required
                >
                  <option value="semanal">Semanal</option>
                  <option value="especifico">Data Específica</option>
                </select>
              </div>

              {novoHorario.tipo_horario === 'semanal' ? (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Dia da Semana</label>
                  <select
                    value={novoHorario.dia_semana}
                    onChange={e => setNovoHorario(prev => ({ ...prev, dia_semana: parseInt(e.target.value) }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  >
                    {diasSemana.map((dia, index) => (
                      <option key={index} value={index}>{dia}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Data Específica</label>
                  <input
                    type="date"
                    value={novoHorario.data_especifica || ''}
                    onChange={e => setNovoHorario(prev => ({ ...prev, data_especifica: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-gray-400 text-sm mb-2">Horário de Início</label>
                <input
                  type="time"
                  value={novoHorario.hora_inicio}
                  onChange={e => {
                    const value = e.target.value
                    const [hours, minutes] = value.split(':').map(Number)
                    const adjustedMinutes = Math.round(minutes / 30) * 30
                    const adjustedTime = `${hours.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`
                    setNovoHorario(prev => ({ ...prev, hora_inicio: adjustedTime }))
                  }}
                  step="1800"
                  className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                  required
                />
                <p className="text-gray-400 text-xs mt-1">Horários em intervalos de 30 minutos</p>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Horário de Fim</label>
                <input
                  type="time"
                  value={novoHorario.hora_fim}
                  onChange={e => {
                    const value = e.target.value
                    const [hours, minutes] = value.split(':').map(Number)
                    const adjustedMinutes = Math.round(minutes / 30) * 30
                    const adjustedTime = `${hours.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`
                    setNovoHorario(prev => ({ ...prev, hora_fim: adjustedTime }))
                  }}
                  step="1800"
                  className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                  required
                />
                <p className="text-gray-400 text-xs mt-1">Horários em intervalos de 30 minutos</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={novoHorario.status}
                  onChange={e => setNovoHorario(prev => ({ ...prev, status: e.target.checked }))}
                  className="form-checkbox bg-[#2a2a2a] border-red-600/20 text-red-600 rounded"
                />
                <label className="text-gray-400">Ativo</label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-lg hover:from-red-700 hover:to-red-900 transition-all"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalAberto(false)
                    setHorarioEmEdicao(null)
                    setNovoHorario({
                      dia_semana: 1,
                      hora_inicio: '',
                      hora_fim: '',
                      status: true,
                      tipo_horario: 'semanal',
                      data_especifica: null
                    })
                  }}
                  className="flex-1 border border-red-600/20 text-white py-3 rounded-lg hover:bg-red-600/10 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 