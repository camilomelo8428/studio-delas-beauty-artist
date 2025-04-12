import { supabase } from '../lib/supabase'

// Tipos
export interface Cliente {
  id: string
  nome: string
  telefone: string
  created_at: string
  updated_at: string
}

export type CargoFuncionario = 
  | 'barbeiro'
  | 'cabeleireiro'
  | 'manicure'
  | 'esteticista'
  | 'maquiador'
  | 'designer_sobrancelhas'
  | 'massagista'
  | 'depilador'
  | 'admin'

export interface Funcionario {
  id: string
  nome: string
  email: string
  telefone: string
  foto_url: string | null
  status: boolean
  comissao: number
  especialidades: string[]
  created_at?: string
  updated_at?: string
  funcoes?: { funcao: CargoFuncionario; principal: boolean }[]
}

export interface Servico {
  id: string
  nome: string
  descricao: string
  preco: number
  preco_original?: number
  duracao_minutos: number
  foto_url?: string | null
  status: boolean
  created_at: string
  updated_at: string
}

export interface Horario {
  id: string
  dia_semana: number | null
  hora_inicio: string
  hora_fim: string
  status: boolean
  tipo_horario: 'semanal' | 'especifico'
  data_especifica: string | null
}

export interface Agendamento {
  id: string
  cliente: Cliente
  funcionario: Funcionario
  servico: Servico
  data: string
  horario: string
  status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado'
  observacao?: string
  created_at: string
  updated_at: string
}

export interface NovoAgendamento {
  cliente_id: string
  funcionario_id: string
  servico_id: string
  data: string
  horario: string
  status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado'
  observacao?: string
}

export interface AtualizarAgendamento {
  data?: string
  horario?: string
  status?: 'pendente' | 'confirmado' | 'concluido' | 'cancelado'
  observacao?: string
}

export interface NovoFuncionario {
  nome: string
  email: string
  telefone: string
  foto_url: string | null
  comissao: number
  especialidades: string[]
  status: boolean
  funcoes: { funcao: CargoFuncionario; principal: boolean }[]
}

export interface AtualizarFuncionario {
  nome?: string
  email?: string
  senha?: string
  telefone?: string
  foto_url?: string | null
  comissao?: number
  especialidades?: string[]
  status?: boolean
  funcoes?: { funcao: CargoFuncionario; principal: boolean }[]
}

export interface NovoServico {
  nome: string
  descricao: string
  preco: number
  duracao_minutos: number
  categoria: 'barbearia' | 'salao'
  status: boolean
}

export interface AtualizarServico {
  nome?: string
  descricao?: string
  preco?: number
  duracao_minutos?: number
  categoria?: 'barbearia' | 'salao'
  status?: boolean
}

export interface NovoHorario {
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  status: boolean
}

export interface AtualizarHorario {
  dia_semana?: number
  hora_inicio?: string
  hora_fim?: string
  status?: boolean
}

// Serviços de Funcionários
export const funcionarioService = {
  listar: async () => {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .order('nome')
    
    if (error) throw error
    return data as Funcionario[]
  },

  criar: async (funcionario: Omit<Funcionario, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('funcionarios')
      .insert([funcionario])
      .select()
      .single()
    
    if (error) throw error
    return data as Funcionario
  },

  atualizar: async (id: string, funcionario: Partial<Funcionario>) => {
    const { data, error } = await supabase
      .from('funcionarios')
      .update(funcionario)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Funcionario
  },

  excluir: async (id: string) => {
    const { error } = await supabase
      .from('funcionarios')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  uploadFoto: async (file: File) => {
    try {
      console.log('Iniciando upload de foto...')
      
      // Validar arquivo
      if (!file) {
        throw new Error('Nenhum arquivo fornecido')
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      console.log('Tentando upload para:', filePath)

      // Fazer upload
      const { data, error: uploadError } = await supabase.storage
        .from('funcionarios')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Alterado para true para sobrescrever se existir
        })

      if (uploadError) {
        console.error('Erro no upload:', uploadError)
        throw uploadError
      }

      console.log('Upload realizado com sucesso:', data)

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('funcionarios')
        .getPublicUrl(filePath)

      console.log('URL pública gerada:', publicUrl)
      return publicUrl

    } catch (error) {
      console.error('Erro detalhado no upload:', error)
      throw error
    }
  }
}

// Serviços de Serviços
export const servicoService = {
  listar: async () => {
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .order('nome')
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Erro ao listar serviços:', error)
      return { data: null, error }
    }
  },

  criar: async (servico: {
    nome: string
    descricao: string
    preco: number
    duracao_minutos: number
    foto_url?: string
    categoria: 'barbearia' | 'salao'
    status: boolean
  }) => {
    try {
      console.log('Tentando criar serviço:', servico)
      const { data, error } = await supabase
        .from('servicos')
        .insert([servico])
        .select()
        .single()
      
      if (error) {
        console.error('Erro do Supabase:', error)
        throw error
      }
      return { data, error: null }
    } catch (error: any) {
      console.error('Erro ao criar serviço:', error)
      return { data: null, error }
    }
  },

  atualizar: async (id: string, servico: Partial<{
    nome: string
    descricao: string
    preco: number
    duracao_minutos: number
    foto_url: string
    categoria: 'barbearia' | 'salao'
    status: boolean
  }>) => {
    try {
      console.log('Tentando atualizar serviço:', { id, servico })
      const { data, error } = await supabase
        .from('servicos')
        .update(servico)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Erro do Supabase:', error)
        throw error
      }
      return { data, error: null }
    } catch (error: any) {
      console.error('Erro ao atualizar serviço:', error)
      return { data: null, error }
    }
  },

  excluir: async (id: string) => {
    try {
      const { error } = await supabase
        .from('servicos')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Erro ao excluir serviço:', error)
      return { error }
    }
  }
}

// Serviços de Agendamentos
export const agendamentoService = {
  listar: async () => {
    const { data, error } = await supabase
      .from('agendamentos')
      .select(`
        *,
        cliente:clientes(nome, telefone),
        funcionario:funcionarios(nome),
        servico:servicos(nome, duracao_minutos)
      `)
      .order('data_hora', { ascending: true })
    
    if (error) throw error
    return data as Agendamento[]
  },

  buscarPorData: async (data: string) => {
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select(`
        *,
        cliente:clientes(nome, telefone),
        funcionario:funcionarios(nome),
        servico:servicos(nome, duracao_minutos)
      `)
      .gte('data_hora', `${data}T00:00:00`)
      .lte('data_hora', `${data}T23:59:59`)
      .order('data_hora', { ascending: true })
    
    if (error) throw error
    return agendamentos as Agendamento[]
  },

  buscarPorStatus: async (status: Agendamento['status']) => {
    const { data, error } = await supabase
      .from('agendamentos')
      .select(`
        *,
        cliente:clientes(nome, telefone),
        funcionario:funcionarios(nome),
        servico:servicos(nome, duracao_minutos)
      `)
      .eq('status', status)
      .order('data_hora', { ascending: true })
    
    if (error) throw error
    return data as Agendamento[]
  },

  atualizar: async (id: string, agendamento: Partial<Agendamento>) => {
    const { data, error } = await supabase
      .from('agendamentos')
      .update(agendamento)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Agendamento
  },

  excluir: async (id: string) => {
    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Serviço de Upload de Imagens
export { storageService } from './storage'

export async function adicionarHorario(horario: Omit<Horario, 'id'>) {
  try {
    const { data, error } = await supabase
      .from('horarios')
      .insert([horario])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao adicionar horário:', error)
    throw error
  }
}

export async function atualizarHorario(id: string, horario: Partial<Omit<Horario, 'id'>>) {
  try {
    const { data, error } = await supabase
      .from('horarios')
      .update(horario)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao atualizar horário:', error)
    throw error
  }
} 