import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Agendamento } from '../../services/admin'

interface AgendamentosProps {
  funcionarioId: string
}

export default function Agendamentos({ funcionarioId }: AgendamentosProps) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'confirmado' | 'concluido' | 'cancelado'>('todos')

  useEffect(() => {
    carregarAgendamentos()
  }, [funcionarioId, filtroStatus])

  async function carregarAgendamentos() {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes(*),
          funcionario:funcionarios(*),
          servico:servicos(*)
        `)
        .eq('funcionario_id', funcionarioId)
        .order('data', { ascending: true })
        .order('horario', { ascending: true })

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }

      const { data, error } = await query

      if (error) throw error

      setAgendamentos(data)
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err)
      setError('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }

  async function atualizarStatusAgendamento(id: string, novoStatus: 'confirmado' | 'concluido' | 'cancelado') {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: novoStatus })
        .eq('id', id)

      if (error) throw error

      await carregarAgendamentos()
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      setError('Erro ao atualizar status do agendamento')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFiltroStatus('todos')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filtroStatus === 'todos'
              ? 'bg-red-600 text-white'
              : 'text-gray-400 hover:bg-red-600/10 hover:text-white'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFiltroStatus('pendente')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filtroStatus === 'pendente'
              ? 'bg-yellow-600 text-white'
              : 'text-gray-400 hover:bg-yellow-600/10 hover:text-white'
          }`}
        >
          Pendentes
        </button>
        <button
          onClick={() => setFiltroStatus('confirmado')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filtroStatus === 'confirmado'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-blue-600/10 hover:text-white'
          }`}
        >
          Confirmados
        </button>
        <button
          onClick={() => setFiltroStatus('concluido')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filtroStatus === 'concluido'
              ? 'bg-green-600 text-white'
              : 'text-gray-400 hover:bg-green-600/10 hover:text-white'
          }`}
        >
          Concluídos
        </button>
        <button
          onClick={() => setFiltroStatus('cancelado')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filtroStatus === 'cancelado'
              ? 'bg-red-600 text-white'
              : 'text-gray-400 hover:bg-red-600/10 hover:text-white'
          }`}
        >
          Cancelados
        </button>
      </div>

      {/* Lista de Agendamentos */}
      <div className="space-y-4">
        {agendamentos.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            Nenhum agendamento encontrado
          </div>
        ) : (
          agendamentos.map(agendamento => (
            <div
              key={agendamento.id}
              className="bg-[#1a1a1a] rounded-lg border border-red-600/10 p-4 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{agendamento.servico.nome}</h3>
                  <p className="text-gray-400">Data: {new Date(agendamento.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                    timeZone: 'America/Sao_Paulo'
                  })}</p>
                  <p className="text-gray-400">Horário: {agendamento.horario}</p>
                  <p className="text-gray-400">Cliente: {agendamento.cliente.nome}</p>
                  <p className="text-gray-400">Telefone: {agendamento.cliente.telefone}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  agendamento.status === 'pendente'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : agendamento.status === 'confirmado'
                    ? 'bg-blue-500/20 text-blue-400'
                    : agendamento.status === 'concluido'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {agendamento.status.toUpperCase()}
                </span>
              </div>

              {/* Ações */}
              {agendamento.status === 'pendente' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => atualizarStatusAgendamento(agendamento.id, 'confirmado')}
                    className="flex-1 bg-blue-600/20 text-blue-400 border border-blue-600/20 py-2 rounded hover:bg-blue-600/30 transition-colors"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => atualizarStatusAgendamento(agendamento.id, 'cancelado')}
                    className="flex-1 bg-red-600/20 text-red-500 border border-red-600/20 py-2 rounded hover:bg-red-600/30 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {agendamento.status === 'confirmado' && (
                <button
                  onClick={() => atualizarStatusAgendamento(agendamento.id, 'concluido')}
                  className="w-full bg-green-600/20 text-green-400 border border-green-600/20 py-2 rounded hover:bg-green-600/30 transition-colors"
                >
                  Marcar como Concluído
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
} 