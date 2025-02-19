import { supabase } from '../lib/supabase'

export type CategoriaProduto = 'cabelo' | 'barba' | 'skincare' | 'perfumaria' | 'acessorios'

export interface ProdutoImagem {
  id: string
  produto_id: string
  url: string
  ordem: number
  principal: boolean
  created_at: string
  updated_at: string
}

export interface Produto {
  id: string
  nome: string
  descricao: string
  preco: number
  preco_promocional: number | null
  estoque: number
  categoria: CategoriaProduto
  marca: string
  destaque: boolean
  status: boolean
  created_at: string
  updated_at: string
  imagens?: ProdutoImagem[]
}

export const produtos = {
  // Listar todos os produtos ativos
  listar: async () => {
    console.log('Iniciando listagem de produtos...')
    const { data: produtos, error } = await supabase
      .from('produtos')
      .select(`
        *,
        imagens:produto_imagens(*)
      `)
      .eq('status', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao listar produtos:', error)
      throw error
    }
    console.log('Produtos retornados:', produtos)
    return produtos as Produto[]
  },

  // Listar produtos por categoria
  listarPorCategoria: async (categoria: CategoriaProduto) => {
    console.log('Iniciando listagem por categoria:', categoria)
    const { data: produtos, error } = await supabase
      .from('produtos')
      .select(`
        *,
        imagens:produto_imagens(*)
      `)
      .eq('status', true)
      .eq('categoria', categoria)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao listar produtos por categoria:', error)
      throw error
    }
    console.log('Produtos retornados por categoria:', produtos)
    return produtos as Produto[]
  },

  // Listar produtos em destaque
  listarDestaques: async () => {
    console.log('Iniciando listagem de destaques...')
    const { data: produtos, error } = await supabase
      .from('produtos')
      .select(`
        *,
        imagens:produto_imagens(*)
      `)
      .eq('status', true)
      .eq('destaque', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao listar produtos em destaque:', error)
      throw error
    }
    console.log('Produtos em destaque retornados:', produtos)
    return produtos as Produto[]
  },

  // Obter um produto específico
  obter: async (id: string) => {
    const { data: produto, error } = await supabase
      .from('produtos')
      .select(`
        *,
        imagens:produto_imagens(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return produto as Produto
  },

  // Criar um novo produto
  criar: async (produto: Omit<Produto, 'id' | 'created_at' | 'updated_at' | 'imagens'>) => {
    const { data, error } = await supabase
      .from('produtos')
      .insert([produto])
      .select()
      .single()

    if (error) throw error
    return data as Produto
  },

  // Atualizar um produto
  atualizar: async (id: string, produto: Partial<Omit<Produto, 'imagens'>>) => {
    const { data, error } = await supabase
      .from('produtos')
      .update(produto)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Produto
  },

  // Upload de foto do produto
  uploadFoto: async (file: File) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `produtos/${Date.now()}-${Math.random()}.${fileExt}`

    const { error: uploadError, data } = await supabase.storage
      .from('produtos')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('produtos')
      .getPublicUrl(fileName)

    return publicUrl
  },

  // Adicionar imagem ao produto
  adicionarImagem: async (produto_id: string, url: string, principal: boolean = false) => {
    // Se for imagem principal, primeiro remove o status principal de outras imagens
    if (principal) {
      await supabase
        .from('produto_imagens')
        .update({ principal: false })
        .eq('produto_id', produto_id)
        .eq('principal', true)
    }

    // Obtém a maior ordem atual
    const { data: imagens } = await supabase
      .from('produto_imagens')
      .select('ordem')
      .eq('produto_id', produto_id)
      .order('ordem', { ascending: false })
      .limit(1)

    const ordem = imagens && imagens.length > 0 ? imagens[0].ordem + 1 : 0

    const { data, error } = await supabase
      .from('produto_imagens')
      .insert([{
        produto_id,
        url,
        ordem,
        principal
      }])
      .select()
      .single()

    if (error) throw error
    return data as ProdutoImagem
  },

  // Excluir imagem do produto
  excluirImagem: async (id: string) => {
    // Primeiro obtém a URL da imagem
    const { data: imagem, error: selectError } = await supabase
      .from('produto_imagens')
      .select('url')
      .eq('id', id)
      .single()

    if (selectError) throw selectError

    if (imagem) {
      // Extrai o nome do arquivo da URL
      const fileName = imagem.url.split('/').pop()
      if (fileName) {
        // Remove o arquivo do storage
        const { error: storageError } = await supabase.storage
          .from('produtos')
          .remove([`produtos/${fileName}`])

        if (storageError) throw storageError
      }
    }

    // Remove o registro da tabela
    const { error: deleteError } = await supabase
      .from('produto_imagens')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
  },

  // Definir imagem principal
  definirImagemPrincipal: async (produto_id: string, imagem_id: string) => {
    // Primeiro remove o status principal de todas as imagens do produto
    await supabase
      .from('produto_imagens')
      .update({ principal: false })
      .eq('produto_id', produto_id)

    // Define a nova imagem principal
    const { data, error } = await supabase
      .from('produto_imagens')
      .update({ principal: true })
      .eq('id', imagem_id)
      .select()
      .single()

    if (error) throw error
    return data as ProdutoImagem
  },

  // Reordenar imagens
  reordenarImagens: async (produto_id: string, ordem: { id: string, ordem: number }[]) => {
    const { error } = await supabase
      .from('produto_imagens')
      .upsert(
        ordem.map(({ id, ordem }) => ({
          id,
          ordem,
          updated_at: new Date().toISOString()
        }))
      )

    if (error) throw error
  },

  // Excluir um produto
  excluir: async (id: string) => {
    // Primeiro obtém todas as imagens do produto
    const { data: imagens } = await supabase
      .from('produto_imagens')
      .select('url')
      .eq('produto_id', id)

    // Remove os arquivos do storage
    if (imagens && imagens.length > 0) {
      const fileNames = imagens
        .map(img => img.url.split('/').pop())
        .filter(Boolean)
        .map(fileName => `produtos/${fileName}`)

      if (fileNames.length > 0) {
        await supabase.storage
          .from('produtos')
          .remove(fileNames)
      }
    }

    // Remove o produto (as imagens serão removidas automaticamente pelo ON DELETE CASCADE)
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
} 