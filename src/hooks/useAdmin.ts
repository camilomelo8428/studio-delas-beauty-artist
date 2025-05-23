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
  AtualizarAgendamento,
  CargoFuncionario
} from '../services/admin'
import { format, toZonedTime } from 'date-fns-tz'

export function useFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregarFuncionarios = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('funcionarios')
        .select(`
          *,
          funcoes:funcionario_funcoes (
            funcao,
            principal
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transforma os dados para manter compatibilidade com a interface existente
      const funcionariosFormatados = data.map(funcionario => ({
        ...funcionario,
        cargo: funcionario.funcoes?.find(f => f.principal)?.funcao || 'barbeiro'
      }))

      setFuncionarios(funcionariosFormatados)
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
    cargo: CargoFuncionario
    comissao: number
    especialidades: string[]
    status: boolean
    funcoes: { funcao: CargoFuncionario; principal: boolean }[]
  }) => {
    try {
      // Inicia uma transação
      const { data: funcionario, error: funcionarioError } = await supabase
        .from('funcionarios')
        .insert([{
          nome: novoFuncionario.nome,
          email: novoFuncionario.email,
          telefone: novoFuncionario.telefone,
          foto_url: novoFuncionario.foto_url,
          comissao: novoFuncionario.comissao,
          especialidades: novoFuncionario.especialidades,
          status: novoFuncionario.status
        }])
        .select()
        .single()

      if (funcionarioError) throw funcionarioError

      // Insere as funções do funcionário
      const { error: funcoesError } = await supabase
        .from('funcionario_funcoes')
        .insert(
          novoFuncionario.funcoes.map(funcao => ({
            funcionario_id: funcionario.id,
            funcao: funcao.funcao,
            principal: funcao.principal
          }))
        )

      if (funcoesError) throw funcoesError

      // Busca o funcionário com suas funções
      const { data: funcionarioCompleto, error: fetchError } = await supabase
        .from('funcionarios')
        .select(`
          *,
          funcoes:funcionario_funcoes (
            funcao,
            principal
          )
        `)
        .eq('id', funcionario.id)
        .single()

      if (fetchError) throw fetchError

      setFuncionarios(prev => [{
        ...funcionarioCompleto,
        cargo: funcionarioCompleto.funcoes?.find(f => f.principal)?.funcao || 'barbeiro'
      }, ...prev])

      return funcionarioCompleto
    } catch (err) {
      console.error('Erro ao adicionar funcionário:', err)
      throw err
    }
  }

  const atualizarFuncionario = async (id: string, dadosAtualizados: {
    nome?: string
    email?: string
    telefone?: string
    foto_url?: string
    cargo?: CargoFuncionario
    comissao?: number
    especialidades?: string[]
    status?: boolean
    funcoes?: { funcao: CargoFuncionario; principal: boolean }[]
  }) => {
    try {
      // Atualiza os dados básicos do funcionário
      const { data: funcionario, error: funcionarioError } = await supabase
        .from('funcionarios')
        .update({
          nome: dadosAtualizados.nome,
          email: dadosAtualizados.email,
          telefone: dadosAtualizados.telefone,
          foto_url: dadosAtualizados.foto_url,
          comissao: dadosAtualizados.comissao,
          especialidades: dadosAtualizados.especialidades,
          status: dadosAtualizados.status
        })
        .eq('id', id)
        .select()
        .single()

      if (funcionarioError) throw funcionarioError

      // Se houver funções para atualizar
      if (dadosAtualizados.funcoes) {
        // Remove todas as funções existentes
        const { error: deleteError } = await supabase
          .from('funcionario_funcoes')
          .delete()
          .eq('funcionario_id', id)

        if (deleteError) throw deleteError

        // Insere as novas funções
        const { error: insertError } = await supabase
          .from('funcionario_funcoes')
          .insert(
            dadosAtualizados.funcoes.map(funcao => ({
              funcionario_id: id,
              funcao: funcao.funcao,
              principal: funcao.principal
            }))
          )

        if (insertError) throw insertError
      }

      // Busca o funcionário atualizado com suas funções
      const { data: funcionarioCompleto, error: fetchError } = await supabase
        .from('funcionarios')
        .select(`
          *,
          funcoes:funcionario_funcoes (
            funcao,
            principal
          )
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      setFuncionarios(prev => prev.map(f => f.id === id ? {
        ...funcionarioCompleto,
        cargo: funcionarioCompleto.funcoes?.find(f => f.principal)?.funcao || 'barbeiro'
      } : f))

      return funcionarioCompleto
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

      // Remove o funcionário (as funções serão removidas automaticamente pelo CASCADE)
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

      // Garantir que as datas estejam definidas
      const dataAtual = format(toZonedTime(new Date(), 'America/Sao_Paulo'), 'yyyy-MM-dd')
      const dataInicialFormatada = dataInicial || dataAtual
      const dataFinalFormatada = dataFinal || dataAtual

      console.log('Datas da consulta:', { dataInicialFormatada, dataFinalFormatada })

      const { data, error: supabaseError } = await supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes(*),
          servico:servicos(*),
          funcionario:funcionarios(*)
        `)
        .gte('data', dataInicialFormatada)
        .lte('data', dataFinalFormatada)
        .order('data', { ascending: true })
        .order('horario', { ascending: true })

      if (supabaseError) {
        console.error('Erro ao buscar agendamentos:', supabaseError)
        throw supabaseError
      }

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

      // Primeiro buscar o agendamento atual para manter os dados que não serão atualizados
      const { data: agendamentoAtual, error: erroConsulta } = await supabase
        .from('agendamentos')
        .select('data, horario')
        .eq('id', id)
        .single();

      if (erroConsulta || !agendamentoAtual) {
        console.error('Erro ao buscar agendamento:', erroConsulta);
        throw new Error('Agendamento não encontrado');
      }

      // Mesclar os dados atuais com as atualizações
      const dadosAtualizados = {
        ...agendamento,
        data: agendamentoAtual.data,
        horario: agendamentoAtual.horario
      };

      const { data, error } = await supabase
        .from('agendamentos')
        .update(dadosAtualizados)
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