import { supabase } from '../../lib/supabase'

interface Produto {
  id: string
  nome: string
  descricao: string
  preco: number
  estoque: number
  foto_url: string | null
  categoria: string
  status: boolean
  created_at?: string
  updated_at?: string
}

export const produtoService = {
  listar: async () => {
    return await supabase
      .from('produtos')
      .select('*')
      .order('created_at', { ascending: false })
  },

  criar: async (produto: Omit<Produto, 'id' | 'created_at' | 'updated_at'>) => {
    return await supabase
      .from('produtos')
      .insert([produto])
      .select()
      .single()
  },

  atualizar: async (id: string, produto: Partial<Produto>) => {
    return await supabase
      .from('produtos')
      .update(produto)
      .eq('id', id)
  },

  excluir: async (id: string) => {
    return await supabase
      .from('produtos')
      .delete()
      .eq('id', id)
  }
} 