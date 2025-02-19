import { supabase } from '../lib/supabase'

export interface Configuracoes {
  id: string
  nome_empresa: string
  logo_url: string | null
  telefone: string
  email: string
  endereco: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  horario_funcionamento: string
  instagram: string
  facebook: string
  whatsapp: string
  updated_at: string
}

export const configuracoes = {
  async obter() {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .single()

    if (error) throw error
    return data as Configuracoes
  },

  async atualizar(config: Partial<Configuracoes>) {
    const { data, error } = await supabase
      .from('configuracoes')
      .upsert(config)
      .select()
      .single()

    if (error) throw error
    return data as Configuracoes
  },

  async uploadLogo(file: File) {
    const fileName = `logo-${Date.now()}-${file.name}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('configuracoes')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('configuracoes')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  }
} 