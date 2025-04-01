import { supabase } from '../../lib/supabase'

interface ProdutoImagem {
  id: string
  url: string
  principal: boolean
  ordem: number
}

interface Produto {
  id: string
  nome: string
  descricao: string
  preco: number
  preco_promocional: number | null
  estoque: number
  categoria: 'cabelo' | 'estetica' | 'manicure' | 'maquiagem' | 'depilacao' | 'massagem' | 'sobrancelhas' | 'tratamentos'
  marca: string
  destaque: boolean
  status: boolean
  created_at?: string
  updated_at?: string
  imagens?: ProdutoImagem[]
}

export const produtoService = {
  listar: async () => {
    return await supabase
      .from('produtos')
      .select(`
        *,
        imagens:produto_imagens(*)
      `)
      .order('created_at', { ascending: false })
  },

  criar: async (produto: Omit<Produto, 'id' | 'created_at' | 'updated_at' | 'imagens'>) => {
    return await supabase
      .from('produtos')
      .insert([produto])
      .select(`
        *,
        imagens:produto_imagens(*)
      `)
      .single()
  },

  atualizar: async (id: string, produto: Partial<Omit<Produto, 'imagens'>>) => {
    return await supabase
      .from('produtos')
      .update(produto)
      .eq('id', id)
      .select(`
        *,
        imagens:produto_imagens(*)
      `)
      .single()
  },

  excluir: async (id: string) => {
    return await supabase
      .from('produtos')
      .delete()
      .eq('id', id)
  }
} 