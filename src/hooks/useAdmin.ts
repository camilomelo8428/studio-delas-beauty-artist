import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type {
  Funcionario,
  NovoFuncionario,
  AtualizarFuncionario,
  Servico,
  NovoServico,
  AtualizarServico,
  Horario,
  NovoHorario,
  AtualizarHorario,
  Agendamento,
  NovoAgendamento,
  AtualizarAgendamento
} from '../services/admin'

export function useFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregarFuncionarios = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setFuncionarios(data)
    } catch (err) {
      setError('Erro ao carregar funcionários')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const adicionarFuncionario = async (novoFuncionario: {
    nome: string
    email: string
    telefone: string
    foto_url: string
    status: boolean
  }) => {
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .insert([novoFuncionario])
        .select()
        .single()

      if (error) throw error

      setFuncionarios(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Erro ao adicionar funcionário:', err)
      throw err
    }
  }

  const atualizarFuncionario = async (id: string, dadosAtualizados: {
    nome: string
    email: string
    telefone: string
    foto_url: string
    status: boolean
  }) => {
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .update(dadosAtualizados)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setFuncionarios(prev => prev.map(f => f.id === id ? data : f))
      return data
    } catch (err) {
      console.error('Erro ao atualizar funcionário:', err)
      throw err
    }
  }

  const excluirFuncionario = async (id: string) => {
    try {
      // Busca a foto do funcionário
      const { data: funcionario } = await supabase
        .from('funcionarios')
        .select('foto_url')
        .eq('id', id)
        .single()

      // Se tiver foto, remove do storage
      if (funcionario?.foto_url) {
        const fileName = funcionario.foto_url.split('funcionarios/').pop()
        if (fileName) {
          await supabase.storage
            .from('funcionarios')
            .remove([fileName])
        }
      }

      // Remove o funcionário (os agendamentos serão removidos automaticamente pelo CASCADE)
      const { error: deleteError } = await supabase
        .from('funcionarios')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Atualiza a lista
      setFuncionarios(prev => prev.filter(f => f.id !== id))
    } catch (err) {
      console.error('Erro ao excluir funcionário:', err)
      throw err
    }
  }

  useEffect(() => {
    carregarFuncionarios()
  }, [])

  return {
    funcionarios,
    loading,
    error,
    adicionarFuncionario,
    atualizarFuncionario,
    excluirFuncionario
  }
}

export function useServicos() {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    carregarServicos()
  }, [])

  async function carregarServicos() {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .order('nome')

      if (error) throw error

      setServicos(data)
    } catch (err) {
      console.error('Erro ao carregar serviços:', err)
      setError('Erro ao carregar serviços')
    } finally {
      setLoading(false)
    }
  }

  async function adicionarServico(servico: NovoServico) {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('servicos')
        .insert([servico])
        .select()
        .single()

      if (error) throw error

      setServicos(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Erro ao adicionar serviço:', err)
      setError('Erro ao adicionar serviço')
      throw err
    }
  }

  async function atualizarServico(id: string, servico: AtualizarServico) {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('servicos')
        .update(servico)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setServicos(prev => prev.map(s => s.id === id ? data : s))
      return data
    } catch (err) {
      console.error('Erro ao atualizar serviço:', err)
      setError('Erro ao atualizar serviço')
      throw err
    }
  }

  async function excluirServico(id: string) {
    try {
      setError(null)

      const { error } = await supabase
        .from('servicos')
        .delete()
        .eq('id', id)

      if (error) throw error

      setServicos(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error('Erro ao excluir serviço:', err)
      setError('Erro ao excluir serviço')
      throw err
    }
  }

  return {
    servicos,
    loading,
    error,
    adicionarServico,
    atualizarServico,
    excluirServico
  }
}

export function useHorarios() {
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const carregarHorarios = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('horarios')
        .select('*')
        .order('tipo_horario', { ascending: false })
        .order('data_especifica', { ascending: true })
        .order('dia_semana')

      if (error) throw error

      // Garante que a data seja mantida como está no banco
      const horariosFormatados = data?.map(horario => ({
        ...horario,
        data_especifica: horario.data_especifica ? horario.data_especifica.split('T')[0] : null
      })) || []

      setHorarios(horariosFormatados)
    } catch (err: any) {
      console.error('Erro ao carregar horários:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdicionarHorario = async (horario: Omit<Horario, 'id'>) => {
    try {
      // Garante que a data seja enviada sem timezone
      const horarioFormatado = {
        ...horario,
        data_especifica: horario.data_especifica ? horario.data_especifica.split('T')[0] : null
      }

      const { data, error } = await supabase
        .from('horarios')
        .insert([horarioFormatado])
        .select()
        .single()

      if (error) throw error
      await carregarHorarios()
      return data
    } catch (err: any) {
      console.error('Erro ao adicionar horário:', err)
      throw err
    }
  }

  const handleAtualizarHorario = async (id: string, horario: Partial<Omit<Horario, 'id'>>) => {
    try {
      // Garante que a data seja enviada sem timezone
      const horarioFormatado = {
        ...horario,
        data_especifica: horario.data_especifica ? horario.data_especifica.split('T')[0] : null
      }

      const { data, error } = await supabase
        .from('horarios')
        .update(horarioFormatado)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      await carregarHorarios()
      return data
    } catch (err: any) {
      console.error('Erro ao atualizar horário:', err)
      throw err
    }
  }

  useEffect(() => {
    carregarHorarios()
  }, [])

  return {
    horarios,
    loading,
    error,
    adicionarHorario: handleAdicionarHorario,
    atualizarHorario: handleAtualizarHorario,
    excluirHorario: async (id: string) => {
      try {
        const { error } = await supabase
          .from('horarios')
          .delete()
          .eq('id', id)

        if (error) throw error
        await carregarHorarios()
      } catch (err: any) {
        console.error('Erro ao excluir horário:', err)
        throw err
      }
    }
  }
}

export function useAgendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregarAgendamentosPorData = useCallback(async (dataInicial: string, dataFinal: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: supabaseError } = await supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes(*),
          servico:servicos(*),
          funcionario:funcionarios(*)
        `)
        .gte('data', dataInicial)
        .lte('data', dataFinal)
        .order('data', { ascending: true })
        .order('horario', { ascending: true })

      if (supabaseError) throw supabaseError

      setAgendamentos(data || [])
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
      setError('Não foi possível carregar os agendamentos.')
    } finally {
      setLoading(false)
    }
  }, [])

  const carregarAgendamentosPorStatus = useCallback(async (status: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes(*),
          funcionario:funcionarios(*),
          servico:servicos(*)
        `)
        .eq('status', status)
        .order('data', { ascending: true })
        .order('horario', { ascending: true })

      if (error) throw error

      setAgendamentos(agendamentos)
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err)
      setError('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarAgendamentos()
  }, [])

  async function carregarAgendamentos() {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes(*),
          funcionario:funcionarios(*),
          servico:servicos(*)
        `)
        .order('data', { ascending: true })
        .order('horario', { ascending: true })

      if (error) throw error

      setAgendamentos(data)
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err)
      setError('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }

  async function adicionarAgendamento(agendamento: NovoAgendamento) {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('agendamentos')
        .insert([agendamento])
        .select(`
          *,
          cliente:clientes(*),
          funcionario:funcionarios(*),
          servico:servicos(*)
        `)
        .single()

      if (error) throw error

      setAgendamentos(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Erro ao adicionar agendamento:', err)
      setError('Erro ao adicionar agendamento')
      throw err
    }
  }

  async function atualizarAgendamento(id: string, agendamento: AtualizarAgendamento) {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('agendamentos')
        .update(agendamento)
        .eq('id', id)
        .select(`
          *,
          cliente:clientes(*),
          funcionario:funcionarios(*),
          servico:servicos(*)
        `)
        .single()

      if (error) throw error

      setAgendamentos(prev => prev.map(a => a.id === id ? data : a))
      return data
    } catch (err) {
      console.error('Erro ao atualizar agendamento:', err)
      setError('Erro ao atualizar agendamento')
      throw err
    }
  }

  async function excluirAgendamento(id: string) {
    try {
      setError(null)

      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id)

      if (error) throw error

      setAgendamentos(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      console.error('Erro ao excluir agendamento:', err)
      setError('Erro ao excluir agendamento')
      throw err
    }
  }

  return {
    agendamentos,
    loading,
    error,
    carregarAgendamentosPorData,
    carregarAgendamentosPorStatus,
    adicionarAgendamento,
    atualizarAgendamento,
    excluirAgendamento
  }
}

export function useStorage() {
  const [error, setError] = useState<string | null>(null)

  async function uploadImagem(bucket: string, file: File) {
    try {
      setError(null)

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      return publicUrl
    } catch (err) {
      console.error('Erro ao fazer upload da imagem:', err)
      setError('Erro ao fazer upload da imagem')
      throw err
    }
  }

  async function excluirImagem(bucket: string, path: string) {
    try {
      setError(null)

      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      if (error) throw error
    } catch (err) {
      console.error('Erro ao excluir imagem:', err)
      setError('Erro ao excluir imagem')
      throw err
    }
  }

  return {
    error,
    uploadImagem,
    excluirImagem
  }
} 