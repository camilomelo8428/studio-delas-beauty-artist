import { useState, useEffect } from 'react'
import { useAgendamentos } from '../../hooks/useAdmin'
import type { Agendamento } from '../../services/admin'
import ConfirmationModal from '../ConfirmationModal'

export default function Agendamentos() {
  const { 
    agendamentos, 
    loading, 
    error,
    atualizarAgendamento,
    excluirAgendamento,
    carregarAgendamentosPorData,
    carregarAgendamentosPorStatus
  } = useAgendamentos()

  const [modalAberto, setModalAberto] = useState(false)
  const [agendamentoEmEdicao, setAgendamentoEmEdicao] = useState<Agendamento | null>(null)
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0])
  const [filtroStatus, setFiltroStatus] = useState<'pendente' | 'confirmado' | 'concluido' | 'cancelado' | ''>('')
  const [visualizacao, setVisualizacao] = useState<'lista' | 'cards'>('cards')
  const [agendamentoParaExcluir, setAgendamentoParaExcluir] = useState<Agendamento | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (agendamentoEmEdicao) {
        await atualizarAgendamento(agendamentoEmEdicao.id, {
          status: agendamentoEmEdicao.status
        })
      }
      setModalAberto(false)
      setAgendamentoEmEdicao(null)
      
      // Recarrega os agendamentos com os filtros atuais
      if (filtroData) {
        await carregarAgendamentosPorData(filtroData)
      } else if (filtroStatus) {
        await carregarAgendamentosPorStatus(filtroStatus)
      }
    } catch (err) {
      console.error('Erro ao salvar agendamento:', err)
    }
  }

  const handleFiltroDataChange = async (data: string) => {
    setFiltroData(data)
    setFiltroStatus('')
    await carregarAgendamentosPorData(data)
  }

  const handleFiltroStatusChange = async (status: typeof filtroStatus) => {
    setFiltroStatus(status)
    setFiltroData('')
    if (status) {
      await carregarAgendamentosPorStatus(status)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'pendente': 'bg-yellow-500/20 text-yellow-400',
      'confirmado': 'bg-blue-500/20 text-blue-400',
      'concluido': 'bg-green-500/20 text-green-400',
      'cancelado': 'bg-red-500/20 text-red-400'
    }
    return colors[status as keyof typeof colors] || ''
  }

  const handleExcluirClick = (agendamento: Agendamento) => {
    setAgendamentoParaExcluir(agendamento)
  }

  const handleConfirmarExclusao = async () => {
    if (agendamentoParaExcluir) {
      await excluirAgendamento(agendamentoParaExcluir.id)
      setAgendamentoParaExcluir(null)
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
              onClick={() => setVisualizacao('cards')}
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
              onClick={() => setVisualizacao('lista')}
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

        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-gray-400 text-sm mb-2">Data</label>
          <input
            type="date"
            value={filtroData}
            onChange={e => handleFiltroDataChange(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg px-4 py-2 text-white focus:border-red-600 focus:outline-none"
          />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-gray-400 text-sm mb-2">Status</label>
          <select
            value={filtroStatus}
            onChange={e => handleFiltroStatusChange(e.target.value as typeof filtroStatus)}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg px-4 py-2 text-white focus:border-red-600 focus:outline-none"
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="confirmado">Confirmado</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
          </div>
        </div>
      </div>
      
      {/* Visualização em Cards */}
      {visualizacao === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {agendamentos.map(agendamento => (
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
                        {new Date(agendamento.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                          timeZone: 'America/Sao_Paulo'
                        })}
                      </p>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agendamento.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {agendamento.status.charAt(0).toUpperCase() + agendamento.status.slice(1)}
                      </span>
                    </div>
                        </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setAgendamentoEmEdicao(agendamento)
                        setModalAberto(true)
                      }}
                      className="p-1 text-blue-500 hover:text-blue-400 transition-colors"
                      title="Editar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleExcluirClick(agendamento)}
                      className="p-1 text-red-500 hover:text-red-400 transition-colors"
                      title="Excluir"
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
                      {agendamento.funcionario.funcao}
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
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(agendamento.servico.preco)}
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
                {agendamentos.map(agendamento => (
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
                            {agendamento.funcionario.funcao}
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
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format(agendamento.servico.preco)}
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
                          {new Date(agendamento.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                            timeZone: 'America/Sao_Paulo'
                          })}
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
                          onClick={() => {
                            setAgendamentoEmEdicao(agendamento)
                            setModalAberto(true)
                          }}
                          className="p-1 text-blue-500 hover:text-blue-400 transition-colors"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleExcluirClick(agendamento)}
                          className="p-1 text-red-500 hover:text-red-400 transition-colors"
                          title="Excluir"
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
          <div className="bg-[#1a1a1a] p-6 rounded-lg w-full max-w-md relative border border-red-600/30">
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
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalAberto(false)
                    setAgendamentoEmEdicao(null)
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

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmationModal
        isOpen={!!agendamentoParaExcluir}
        onClose={() => setAgendamentoParaExcluir(null)}
        onConfirm={handleConfirmarExclusao}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o agendamento de ${agendamentoParaExcluir?.cliente?.nome || 'cliente'} para ${new Date(agendamentoParaExcluir?.data + 'T00:00:00' || '').toLocaleDateString('pt-BR', {
          timeZone: 'America/Sao_Paulo'
        })} às ${agendamentoParaExcluir?.horario}?`}
        confirmText="Sim, Excluir"
        cancelText="Não, Manter"
        type="danger"
        isLoading={loading}
      />
    </div>
  )
} 