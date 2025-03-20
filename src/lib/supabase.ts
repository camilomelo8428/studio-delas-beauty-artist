import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos
export interface Cliente {
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
}

// Funções de Autenticação
export const auth = {
  // Registrar novo usuário
  registrar: async (email: string, senha: string, nome: string, telefone: string) => {
    try {
      // 1. Criar usuário na auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome,
            telefone
          }
        }
      })

      if (authError) {
        // Traduz as mensagens de erro comuns
        if (authError.message.includes('already exists')) {
          return { success: false, error: 'Este e-mail já está cadastrado. Por favor, use outro e-mail ou faça login.' }
        }
        if (authError.message.includes('password')) {
          return { success: false, error: 'A senha deve ter pelo menos 6 caracteres.' }
        }
        if (authError.message.includes('email')) {
          return { success: false, error: 'Por favor, insira um e-mail válido.' }
        }
        throw authError
      }

      // Salvar a senha na tabela de clientes
      if (authData.user) {
        const { error: updateError } = await supabase
          .rpc('atualizar_senha_cliente', {
            p_cliente_id: authData.user.id,
            p_senha: senha
          })

        if (updateError) {
          console.error('Erro ao salvar senha:', updateError)
        }
      }

      return { success: true, error: null }
    } catch (error: any) {
      console.error('Erro ao registrar:', error)
      return { success: false, error: error.message || 'Erro ao criar conta. Tente novamente.' }
    }
  },

  // Login
  login: async (email: string, senha: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      if (error) throw error

      // Atualizar a senha na tabela de clientes se necessário
      if (data.user) {
        const { error: updateError } = await supabase
          .rpc('atualizar_senha_cliente', {
            p_cliente_id: data.user.id,
            p_senha: senha
          })

        if (updateError) {
          console.error('Erro ao atualizar senha:', updateError)
        }
      }

      return { success: true, data, error: null }
    } catch (error) {
      console.error('Erro ao fazer login:', error)
      return { success: false, data: null, error }
    }
  },

  // Logout
  logout: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      return { success: true, error: null }
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      return { success: false, error }
    }
  },

  // Verificar sessão atual
  getSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error

      return { session, error: null }
    } catch (error) {
      console.error('Erro ao obter sessão:', error)
      return { session: null, error }
    }
  },

  // Obter dados do cliente atual
  getClienteAtual: async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      if (!session?.user) {
        return { cliente: null, error: 'Usuário não autenticado' }
      }

      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (clienteError) throw clienteError

      return { cliente, error: null }
    } catch (error) {
      console.error('Erro ao obter cliente:', error)
      return { cliente: null, error }
    }
  },

  // Verificar se o usuário é administrador
  isAdmin: async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      if (!session?.user) {
        return { isAdmin: false, error: 'Usuário não autenticado' }
      }

      // Verificar se o usuário tem a role 'admin' nos metadados
      const isAdmin = session.user.user_metadata?.role === 'admin'
      return { isAdmin, error: null }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error)
      return { isAdmin: false, error }
    }
  }
} 