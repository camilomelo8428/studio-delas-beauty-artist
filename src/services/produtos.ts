import { supabase } from '../lib/supabase'

export type CategoriaProduto = 
  | 'cabelo' 
  | 'estetica' 
  | 'manicure' 
  | 'maquiagem' 
  | 'depilacao' 
  | 'massagem' 
  | 'sobrancelhas' 
  | 'tratamentos'

export interface ProdutoImagem {
  id: string
  produto_id: string
  url: string
  ordem: number
  principal: boolean
  created_at: string
}

export interface Produto {
  id: string
  nome: string
  descricao: string
  preco: number
  categoria: CategoriaProduto
  status: boolean
  foto_url: string | null
  preco_promocional: number | null
  promocao_ativa: boolean
  promocao_inicio: string | null
  promocao_fim: string | null
  promocao_descricao: string | null
  imagens?: ProdutoImagem[]
}

// Funções de serviço que usam o Supabase
export const produtos = {
  listar: async () => {
    const { data, error } = await supabase
      .from('produtos')
      .select('*, imagens:produto_imagens(*)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Produto[]
  },

  listarPorCategoria: async (categoria: CategoriaProduto) => {
    const { data, error } = await supabase
      .from('produtos')
      .select('*, imagens:produto_imagens(*)')
      .eq('categoria', categoria)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Produto[]
  },

  listarDestaques: async () => {
    const { data, error } = await supabase
      .from('produtos')
      .select('*, imagens:produto_imagens(*)')
      .eq('destaque', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Produto[]
  },

  buscar: async (id: string) => {
    const { data, error } = await supabase
      .from('produtos')
      .select('*, imagens:produto_imagens(*)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Produto
  },

  criar: async (produto: Omit<Produto, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('produtos')
      .insert(produto)
      .select()
      .single()

    if (error) throw error
    return data as Produto
  },

  atualizar: async (id: string, produto: Partial<Omit<Produto, 'id' | 'created_at' | 'updated_at'>>) => {
    const { data, error } = await supabase
      .from('produtos')
      .update(produto)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Produto
  },

  excluir: async (id: string) => {
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }
} 