import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'

interface Usuario {
  id: string
  nome: string
  email: string
  telefone: string
  data_nascimento: string | null
  genero: string | null
  cpf: string | null
  endereco: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  cep: string | null
  foto_url: string | null
  observacoes: string | null
  senha: string | null
  created_at: string
  updated_at: string
  status: boolean
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null)
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false)
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<Usuario | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  useEffect(() => {
    carregarUsuarios()
  }, [])

  const carregarUsuarios = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsuarios(data || [])
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err)
      setError(err.message)
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  const atualizarStatusUsuario = async (id: string, novoStatus: boolean) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('clientes')
        .update({ status: novoStatus })
        .eq('id', id)

      if (error) throw error
      
      setUsuarios(usuarios.map(usuario => 
        usuario.id === id ? { ...usuario, status: novoStatus } : usuario
      ))
      
      toast.success(novoStatus ? 'Usuário ativado com sucesso!' : 'Usuário desativado com sucesso!')
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err)
      toast.error('Erro ao atualizar status do usuário')
    } finally {
      setLoading(false)
    }
  }

  const excluirUsuario = async (usuario: Usuario) => {
    try {
      setLoading(true)
      
      // Chamar a função que remove completamente o usuário
      const { error } = await supabase
        .rpc('delete_user_complete', {
          user_id: usuario.id
        })

      if (error) throw error

      setUsuarios(usuarios.filter(u => u.id !== usuario.id))
      setConfirmacaoAberta(false)
      setUsuarioParaExcluir(null)
      toast.success('Usuário excluído com sucesso!')
    } catch (err: any) {
      console.error('Erro ao excluir usuário:', err)
      toast.error('Erro ao excluir usuário')
    } finally {
      setLoading(false)
    }
  }

  // Filtragem de usuários
  const usuariosFiltrados = usuarios.filter(usuario => {
    const matchBusca = 
      usuario.nome.toLowerCase().includes(busca.toLowerCase()) ||
      usuario.email.toLowerCase().includes(busca.toLowerCase()) ||
      usuario.telefone.includes(busca)
    
    const matchStatus = 
      filtroStatus === 'todos' ? true :
      filtroStatus === 'ativos' ? usuario.status :
      !usuario.status

    return matchBusca && matchStatus
  })

  if (loading && usuarios.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-red-500">Usuários</h2>
        
        <div className="flex gap-4">
          {/* Busca */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-64 bg-[#2a2a2a] border border-red-600/20 rounded-lg pl-10 pr-4 py-2 text-white focus:border-red-600 focus:outline-none"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Filtro de Status */}
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as 'todos' | 'ativos' | 'inativos')}
            className="bg-[#2a2a2a] border border-red-600/20 rounded-lg px-4 py-2 text-white focus:border-red-600 focus:outline-none"
          >
            <option value="todos">Todos</option>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}
      
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-red-600/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-red-600/20">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Nome</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Telefone</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Senha</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Cadastro</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-600/10">
              {usuariosFiltrados.map(usuario => (
                <tr key={usuario.id} className="hover:bg-red-600/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {usuario.foto_url ? (
                        <img 
                          src={usuario.foto_url} 
                          alt={usuario.nome}
                          className="w-8 h-8 rounded-full object-cover border border-red-600/20"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600/20 to-red-600/30 flex items-center justify-center border border-red-600/20">
                          <span className="text-sm text-red-500">{usuario.nome.slice(0, 2).toUpperCase()}</span>
                        </div>
                      )}
                      <span className="text-white font-medium">{usuario.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{usuario.email}</td>
                  <td className="px-6 py-4 text-gray-400">{usuario.telefone}</td>
                  <td className="px-6 py-4 text-gray-400">
                    <div className="flex items-center gap-2">
                      <span>{mostrarSenha ? usuario.senha : '••••••'}</span>
                      <button
                        onClick={() => setMostrarSenha(!mostrarSenha)}
                        className="p-1 hover:bg-red-600/10 rounded transition-colors"
                      >
                        {mostrarSenha ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                      usuario.status 
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {usuario.status ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setUsuarioSelecionado(usuario)
                          setModalAberto(true)
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      <button 
                        onClick={() => atualizarStatusUsuario(usuario.id, !usuario.status)}
                        className={`p-2 rounded-lg transition-colors ${
                          usuario.status 
                            ? 'text-red-500 hover:bg-red-500/10' 
                            : 'text-green-500 hover:bg-green-500/10'
                        }`}
                        title={usuario.status ? 'Desativar' : 'Ativar'}
                      >
                        {usuario.status ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>

                      <button 
                        onClick={() => {
                          setUsuarioParaExcluir(usuario)
                          setConfirmacaoAberta(true)
                        }}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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

      {/* Modal de Detalhes */}
      {modalAberto && usuarioSelecionado && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg w-full max-w-2xl relative border border-red-600/30">
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              <button
                onClick={() => {
                  setModalAberto(false)
                  setUsuarioSelecionado(null)
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              <div className="flex items-center gap-4 mb-6">
                {usuarioSelecionado.foto_url ? (
                  <img
                    src={usuarioSelecionado.foto_url}
                    alt={usuarioSelecionado.nome}
                    className="w-20 h-20 rounded-full object-cover border-4 border-red-600/20"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600/20 to-red-600/30 flex items-center justify-center border-4 border-red-600/20">
                    <span className="text-2xl text-red-500">
                      {usuarioSelecionado.nome.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-red-500">{usuarioSelecionado.nome}</h3>
                  <p className="text-gray-400">Cliente desde {new Date(usuarioSelecionado.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Informações Pessoais</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">E-mail</p>
                      <p className="text-white">{usuarioSelecionado.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Telefone</p>
                      <p className="text-white">{usuarioSelecionado.telefone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">CPF</p>
                      <p className="text-white">{usuarioSelecionado.cpf || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Data de Nascimento</p>
                      <p className="text-white">
                        {usuarioSelecionado.data_nascimento 
                          ? new Date(usuarioSelecionado.data_nascimento).toLocaleDateString('pt-BR')
                          : 'Não informada'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Gênero</p>
                      <p className="text-white">{usuarioSelecionado.genero || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Senha</p>
                      <div className="flex items-center gap-2">
                        <p className="text-white">{mostrarSenha ? usuarioSelecionado.senha : '••••••'}</p>
                        <button
                          onClick={() => setMostrarSenha(!mostrarSenha)}
                          className="p-1 hover:bg-red-600/10 rounded transition-colors"
                        >
                          {mostrarSenha ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Endereço</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">Endereço</p>
                      <p className="text-white">{usuarioSelecionado.endereco || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Bairro</p>
                      <p className="text-white">{usuarioSelecionado.bairro || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Cidade</p>
                      <p className="text-white">{usuarioSelecionado.cidade || 'Não informada'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Estado</p>
                      <p className="text-white">{usuarioSelecionado.estado || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">CEP</p>
                      <p className="text-white">{usuarioSelecionado.cep || 'Não informado'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {usuarioSelecionado.observacoes && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Observações</h4>
                  <p className="text-white">{usuarioSelecionado.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {confirmacaoAberta && usuarioParaExcluir && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] p-6 rounded-lg w-full max-w-md relative border border-red-600/30">
            <h3 className="text-xl font-bold text-red-500 mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-400 mb-6">
              Tem certeza que deseja excluir o usuário <span className="text-white font-medium">{usuarioParaExcluir.nome}</span>? 
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setConfirmacaoAberta(false)
                  setUsuarioParaExcluir(null)
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirUsuario(usuarioParaExcluir)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 