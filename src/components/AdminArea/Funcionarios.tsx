import { useState, ChangeEvent } from 'react'
import { useFuncionarios, useStorage } from '../../hooks/useAdmin'
import type { Funcionario, CargoFuncionario } from '../../services/admin'
import { toast } from 'react-hot-toast'
import { funcionarioService } from '../../services/admin'
import { supabase } from '../../lib/supabase'
import ConfirmationModal from '../ConfirmationModal'
import { authService } from '../../services/auth'

// Função para formatar o telefone no padrão (XX) XXXXX-XXXX
const formatarTelefone = (telefone: string) => {
  // Remove tudo que não for número
  const numeros = telefone.replace(/\D/g, '')
  
  // Formata no padrão (XX) XXXXX-XXXX
  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
  }
  
  // Se não tiver 11 dígitos, retorna como está
  return telefone
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

export default function Funcionarios() {
  const { 
    funcionarios, 
    loading, 
    error,
    adicionarFuncionario,
    atualizarFuncionario,
    excluirFuncionario
  } = useFuncionarios()

  const { uploadImagem } = useStorage()
  const [modalAberto, setModalAberto] = useState(false)
  const [funcionarioEmEdicao, setFuncionarioEmEdicao] = useState<Funcionario | null>(null)
  const [novoFuncionario, setNovoFuncionario] = useState<Omit<Funcionario, 'id' | 'created_at'> & { funcoes: { funcao: CargoFuncionario; principal: boolean }[] }>({
    nome: '',
    email: '',
    telefone: '',
    foto_url: null,
    comissao: 30,
    especialidades: [],
    status: true,
    funcoes: [{ funcao: 'esteticista', principal: true }]
  })
  const [senha, setSenha] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [funcionarioParaExcluir, setFuncionarioParaExcluir] = useState<Funcionario | null>(null)

  const funcoes = [
    { value: 'barbeiro', label: 'Barbeiro' },
    { value: 'cabeleireiro', label: 'Cabeleireiro' },
    { value: 'manicure', label: 'Manicure' },
    { value: 'esteticista', label: 'Esteticista' },
    { value: 'maquiador', label: 'Maquiador(a)' },
    { value: 'designer_sobrancelhas', label: 'Designer de Sobrancelhas' },
    { value: 'massagista', label: 'Massagista' },
    { value: 'depilador', label: 'Depilador(a)' },
    { value: 'admin', label: 'Administrador' }
  ] as const

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const dadosFuncionario = {
        ...novoFuncionario,
        telefone: formatarTelefone(novoFuncionario.telefone),
        funcoes: novoFuncionario.funcoes.map(f => ({
          funcao: f.funcao.trim() as CargoFuncionario,
          principal: f.principal
        }))
      }

      if (funcionarioEmEdicao) {
        await atualizarFuncionario(funcionarioEmEdicao.id, dadosFuncionario)
        
        // Se tiver senha, cria/atualiza o login
        if (senha) {
          const { success, error } = await authService.criarLoginFuncionario(
            funcionarioEmEdicao.id,
            dadosFuncionario.email,
            senha
          )
          
          if (!success) {
            toast.error(`Erro ao criar login: ${error}`)
          } else {
            toast.success('Login criado com sucesso!')
          }
        }
      } else {
        const funcionario = await adicionarFuncionario(dadosFuncionario)
        
        // Cria o login para o novo funcionário
        const { success, error } = await authService.criarLoginFuncionario(
          funcionario.id,
          dadosFuncionario.email,
          senha
        )
        
        if (!success) {
          toast.error(`Erro ao criar login: ${error}`)
        } else {
          toast.success('Funcionário cadastrado com sucesso!')
        }
      }

      setModalAberto(false)
      setFuncionarioEmEdicao(null)
      setNovoFuncionario({
        nome: '',
        email: '',
        telefone: '',
        foto_url: null,
        status: true,
        comissao: 30,
        especialidades: [],
        funcoes: [{ funcao: 'esteticista', principal: true }]
      })
      setSenha('')
    } catch (err) {
      console.error('Erro ao salvar funcionário:', err)
      toast.error('Erro ao salvar funcionário')
    }
  }

  const handleFotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      setIsLoading(true)
      const file = event.target.files?.[0]
      if (!file) {
        toast.error('Selecione uma foto para upload')
        return
      }

      // Validar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A foto deve ter no máximo 5MB')
        return
      }

      // Validar tipo
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast.error('Formato de arquivo não suportado. Use JPG ou PNG')
        return
      }

      const fotoUrl = await uploadImagem('funcionarios', file)
      
      if (funcionarioEmEdicao) {
        await atualizarFuncionario(funcionarioEmEdicao.id, {
          ...funcionarioEmEdicao,
          foto_url: fotoUrl
        })
      } else {
        setNovoFuncionario(prev => ({ ...prev, foto_url: fotoUrl }))
      }
      toast.success('Foto atualizada com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar foto:', error)
      toast.error('Erro ao fazer upload da foto. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExcluirClick = (funcionario: Funcionario) => {
    setFuncionarioParaExcluir(funcionario)
  }

  const handleConfirmarExclusao = async () => {
    if (!funcionarioParaExcluir) return
    
    try {
      setIsLoading(true)
      await excluirFuncionario(funcionarioParaExcluir.id)
      setFuncionarioParaExcluir(null)
    } catch (err) {
      console.error('Erro ao excluir funcionário:', err)
      alert('Erro ao excluir funcionário. Por favor, tente novamente.')
    } finally {
      setIsLoading(false)
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
        <h2 className="text-2xl font-bold text-red-500">Funcionários</h2>
        <button 
          onClick={() => {
            setFuncionarioEmEdicao(null)
            setModalAberto(true)
            setNovoFuncionario({
              nome: '',
              email: '',
              telefone: '',
              foto_url: null,
              status: true,
              comissao: 30,
              especialidades: [],
              funcoes: [{ funcao: 'esteticista', principal: true }]
            })
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-900 transition-all whitespace-nowrap"
        >
          <span>+</span>
          <span>Adicionar Funcionário</span>
        </button>
      </div>
      
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-red-600/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-red-600/20">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Nome</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Telefone</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Funções</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-600/10">
              {funcionarios.map(funcionario => (
                <tr key={funcionario.id} className="hover:bg-red-600/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {funcionario.foto_url ? (
                        <img 
                          src={funcionario.foto_url} 
                          alt={funcionario.nome}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center">
                          <span className="text-sm">{funcionario.nome.slice(0, 2).toUpperCase()}</span>
                        </div>
                      )}
                      <span className="text-white">{funcionario.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{funcionario.telefone}</td>
                  <td className="px-6 py-4 text-gray-400">
                    <div className="flex flex-wrap gap-1">
                      {funcionario.funcoes?.map((funcao, index) => (
                        <span 
                          key={index}
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            funcao.principal 
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {funcoes.find(f => f.value === funcao.funcao)?.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      funcionario.status 
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {funcionario.status ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => {
                        setFuncionarioEmEdicao(funcionario)
                        setNovoFuncionario({
                          nome: funcionario.nome,
                          email: funcionario.email,
                          telefone: funcionario.telefone,
                          foto_url: funcionario.foto_url || null,
                          status: funcionario.status,
                          comissao: funcionario.comissao,
                          especialidades: funcionario.especialidades,
                          funcoes: funcionario.funcoes || [{ funcao: 'esteticista', principal: true }]
                        })
                        setModalAberto(true)
                      }}
                      className="text-blue-500 hover:text-blue-400 transition-colors"
                    >
                      <span className="sm:hidden">✏️</span>
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button 
                      onClick={() => handleExcluirClick(funcionario)}
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
          <div className="bg-[#1a1a1a] rounded-lg w-full max-w-md relative border border-red-600/30">
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              <h2 className="text-red-600 text-xl font-bold mb-6">
                {funcionarioEmEdicao ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-400 mb-2">Nome</label>
                  <input
                    type="text"
                    value={novoFuncionario.nome}
                    onChange={(e) => setNovoFuncionario(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-2">E-mail</label>
                  <input
                    type="email"
                    value={novoFuncionario.email}
                    onChange={(e) => setNovoFuncionario(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-2">Senha</label>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded p-3 text-white focus:border-red-600 focus:outline-none"
                    required={!funcionarioEmEdicao}
                    minLength={6}
                    placeholder={funcionarioEmEdicao ? "Deixe em branco para manter a senha atual" : "Mínimo 6 caracteres"}
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={novoFuncionario.telefone}
                    onChange={e => setNovoFuncionario(prev => ({ 
                      ...prev, 
                      telefone: formatarTelefoneInput(e.target.value)
                    }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    placeholder="(91) 99999-9999"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Funções</label>
                  <div className="space-y-2">
                    {novoFuncionario.funcoes.map((funcao, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <select
                          value={funcao.funcao}
                          onChange={e => {
                            const novasFuncoes = [...novoFuncionario.funcoes]
                            novasFuncoes[index] = {
                              ...novasFuncoes[index],
                              funcao: e.target.value as CargoFuncionario
                            }
                            setNovoFuncionario(prev => ({ ...prev, funcoes: novasFuncoes }))
                          }}
                          className="flex-1 bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                        >
                          {funcoes.map(f => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="funcao_principal"
                            checked={funcao.principal}
                            onChange={() => {
                              const novasFuncoes = novoFuncionario.funcoes.map((f, i) => ({
                                ...f,
                                principal: i === index
                              }))
                              setNovoFuncionario(prev => ({ ...prev, funcoes: novasFuncoes }))
                            }}
                            className="form-radio bg-[#2a2a2a] border-red-600/20 text-red-600"
                          />
                          <span className="text-gray-400 text-sm">Principal</span>
                        </div>
                        {novoFuncionario.funcoes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const novasFuncoes = novoFuncionario.funcoes.filter((_, i) => i !== index)
                              setNovoFuncionario(prev => ({ ...prev, funcoes: novasFuncoes }))
                            }}
                            className="text-red-500 hover:text-red-400"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setNovoFuncionario(prev => ({
                          ...prev,
                          funcoes: [...prev.funcoes, { funcao: 'barbeiro', principal: false }]
                        }))
                      }}
                      className="text-red-500 hover:text-red-400 text-sm"
                    >
                      + Adicionar outra função
                    </button>
                  </div>
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
                      setFuncionarioEmEdicao(null)
                      setNovoFuncionario({
                        nome: '',
                        email: '',
                        telefone: '',
                        foto_url: null,
                        status: true,
                        comissao: 30,
                        especialidades: [],
                        funcoes: [{ funcao: 'esteticista', principal: true }]
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
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmationModal
        isOpen={!!funcionarioParaExcluir}
        onClose={() => setFuncionarioParaExcluir(null)}
        onConfirm={handleConfirmarExclusao}
        title="Confirmar Exclusão de Funcionário"
        message={`Tem certeza que deseja excluir o funcionário ${funcionarioParaExcluir?.nome}? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Não, Manter"
        type="danger"
        isLoading={isLoading}
      />
    </div>
  )
} 