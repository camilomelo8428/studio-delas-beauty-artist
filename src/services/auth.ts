import { supabase } from '../lib/supabase'

export interface FuncionarioAuth {
  id: string
  nome: string
  email: string
  funcao: 'barbeiro' | 'cabeleireiro' | 'manicure' | 'esteticista_facial' | 'esteticista_corporal' | 'maquiador' | 'designer_sobrancelhas' | 'massagista' | 'depilador' | 'admin'
  status: boolean
  foto_url: string | null
  telefone: string
}

export const authService = {
  loginFuncionario: async (email: string, senha: string): Promise<{ 
    success: boolean
    data?: FuncionarioAuth
    error?: string 
  }> => {
    try {
      const { data, error } = await supabase
        .rpc('autenticar_funcionario', {
          p_email: email,
          p_senha: senha
        })

      if (error) throw error

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Email ou senha incorretos'
        }
      }

      const funcionario = data[0] as FuncionarioAuth

      // Salva os dados do funcionário no localStorage
      localStorage.setItem('funcionario', JSON.stringify(funcionario))

      return {
        success: true,
        data: funcionario
      }
    } catch (err: any) {
      console.error('Erro ao fazer login:', err)
      return {
        success: false,
        error: err.message || 'Erro ao fazer login'
      }
    }
  },

  criarLoginFuncionario: async (funcionarioId: string, email: string, senha: string): Promise<{
    success: boolean
    error?: string
  }> => {
    try {
      const { error } = await supabase
        .rpc('criar_login_funcionario', {
          p_funcionario_id: funcionarioId,
          p_email: email,
          p_senha: senha
        })

      if (error) throw error

      return { success: true }
    } catch (err: any) {
      console.error('Erro ao criar login:', err)
      return {
        success: false,
        error: err.message || 'Erro ao criar login'
      }
    }
  },

  logout: () => {
    localStorage.removeItem('funcionario')
  },

  getFuncionarioLogado: (): FuncionarioAuth | null => {
    const funcionario = localStorage.getItem('funcionario')
    return funcionario ? JSON.parse(funcionario) : null
  }
} 