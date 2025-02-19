import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { authService } from '../../services/auth'
import { storageService } from '../../services/storage'
import toast from 'react-hot-toast'
import type { FuncionarioAuth } from '../../services/auth'

export default function MeuPerfil() {
  const [funcionario, setFuncionario] = useState<FuncionarioAuth | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [senha, setSenha] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const func = authService.getFuncionarioLogado()
    setFuncionario(func)
  }, [])

  if (!funcionario) {
    return (
      <div className="text-center py-8 text-gray-400">
        Erro ao carregar informações do perfil
      </div>
    )
  }

  async function handleUploadFoto() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    try {
      setUploadingFoto(true)
      
      // Upload da foto
      const fileName = `funcionario-${funcionario.id}-${Date.now()}`
      const data = await storageService.upload('funcionarios', fileName, file)
      const publicUrl = await storageService.getPublicUrl('funcionarios', data.path)

      // Atualizar o funcionário com a nova foto
      const { data: funcionarioData, error } = await supabase
        .from('funcionarios')
        .update({ foto_url: publicUrl })
        .eq('id', funcionario.id)
        .select()
        .single()

      if (error) throw error

      // Atualizar o estado local e o localStorage
      const funcionarioAtualizado: FuncionarioAuth = {
        ...funcionario,
        foto_url: publicUrl
      }
      setFuncionario(funcionarioAtualizado)
      localStorage.setItem('funcionario', JSON.stringify(funcionarioAtualizado))

      toast.success('Foto atualizada com sucesso')
    } catch (err) {
      console.error('Erro ao atualizar foto:', err)
      toast.error('Erro ao atualizar foto')
    } finally {
      setUploadingFoto(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleAlterarSenha(e: React.FormEvent) {
    e.preventDefault()
    
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem')
      return
    }

    if (novaSenha.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres')
      return
    }

    try {
      setLoading(true)

      // Primeiro verifica a senha atual
      const { data, error: authError } = await supabase.rpc('autenticar_funcionario', {
        p_email: funcionario.email,
        p_senha: senha
      })

      if (authError || !data || data.length === 0) {
        toast.error('Senha atual incorreta')
        return
      }

      // Atualiza a senha
      const { error } = await supabase.rpc('criar_login_funcionario', {
        p_funcionario_id: funcionario.id,
        p_email: funcionario.email,
        p_senha: novaSenha
      })

      if (error) throw error

      toast.success('Senha alterada com sucesso')
      setSenha('')
      setNovaSenha('')
      setConfirmarSenha('')
    } catch (err) {
      console.error('Erro ao alterar senha:', err)
      toast.error('Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Foto do Perfil */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Foto do Perfil</h2>
        
        <div className="flex items-center gap-6">
          {funcionario.foto_url ? (
            <img 
              src={funcionario.foto_url} 
              alt={funcionario.nome}
              className="w-32 h-32 rounded-full object-cover border-2 border-red-600"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-red-600/20 flex items-center justify-center border-2 border-red-600">
              <span className="text-4xl font-bold text-red-500">
                {funcionario.nome.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}

          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleUploadFoto}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFoto}
              className="bg-red-600/20 text-red-500 border border-red-600/20 px-4 py-2 rounded hover:bg-red-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingFoto ? 'Enviando...' : 'Alterar Foto'}
            </button>
            {funcionario.foto_url && (
              <button
                onClick={async () => {
                  try {
                    setUploadingFoto(true)
                    
                    // Atualizar o funcionário removendo a foto
                    const { error } = await supabase
                      .from('funcionarios')
                      .update({ foto_url: null })
                      .eq('id', funcionario.id)

                    if (error) throw error

                    // Atualizar o estado local e o localStorage
                    const funcionarioAtualizado = { ...funcionario, foto_url: null }
                    setFuncionario(funcionarioAtualizado)
                    localStorage.setItem('funcionario', JSON.stringify(funcionarioAtualizado))

                    toast.success('Foto removida com sucesso')
                  } catch (err) {
                    console.error('Erro ao remover foto:', err)
                    toast.error('Erro ao remover foto')
                  } finally {
                    setUploadingFoto(false)
                  }
                }}
                disabled={uploadingFoto}
                className="text-red-500 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remover Foto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Informações do Perfil */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Informações Pessoais</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Nome</label>
            <p className="text-white">{funcionario.nome}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">E-mail</label>
            <p className="text-white">{funcionario.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Telefone</label>
            <p className="text-white">{funcionario.telefone}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Função</label>
            <p className="text-white capitalize">{funcionario.funcao}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
            <p className="text-white">{funcionario.status ? 'Ativo' : 'Inativo'}</p>
          </div>
        </div>
      </div>

      {/* Alterar Senha */}
      <div className="pt-8 border-t border-red-600/20">
        <h2 className="text-xl font-bold text-white mb-6">Alterar Senha</h2>
        
        <form onSubmit={handleAlterarSenha} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Senha Atual</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-red-600/20 rounded p-3 text-white focus:border-red-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Nova Senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-red-600/20 rounded p-3 text-white focus:border-red-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Confirmar Nova Senha</label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-red-600/20 rounded p-3 text-white focus:border-red-600 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </form>
      </div>
    </div>
  )
} 