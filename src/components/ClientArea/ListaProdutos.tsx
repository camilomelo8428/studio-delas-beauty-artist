import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface ProdutoImagem {
  id: string
  url: string
  principal: boolean
  ordem: number
}

interface Produto {
  id: number
  nome: string
  descricao: string
  preco: number
  preco_promocional: number | null
  categoria: string
  marca: string
  foto_url: string | null
  destaque: boolean
  status: boolean
  imagens: ProdutoImagem[] | null
}

export default function ListaProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)

  useEffect(() => {
    carregarProdutos()
  }, [])

  const carregarProdutos = async () => {
    try {
      setLoading(true)
      setErro('')

      const { data, error } = await supabase
        .from('produtos')
        .select(`
          *,
          imagens:produto_imagens(*)
        `)
        .eq('status', true)
        .order('destaque', { ascending: false })
        .order('nome')

      if (error) throw error

      setProdutos(data || [])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      setErro('Não foi possível carregar os produtos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const formatarPreco = (preco: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco)
  }

  const getImagemPrincipal = (produto: Produto): string | undefined => {
    if (produto.imagens && produto.imagens.length > 0) {
      // Primeiro tenta encontrar a imagem marcada como principal
      const imagemPrincipal = produto.imagens.find(img => img.principal)
      if (imagemPrincipal) return imagemPrincipal.url
      
      // Se não encontrar, usa a primeira imagem
      return produto.imagens[0].url
    }
    // Se não tiver imagens, usa a foto_url legada ou undefined
    return produto.foto_url || undefined
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="text-center p-4">
        <p className="text-red-500">{erro}</p>
        <button
          onClick={carregarProdutos}
          className="mt-4 text-red-500 hover:text-red-400 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (produtos.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-400">Nenhum produto disponível no momento.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {produtos.map((produto) => (
          <div
            key={produto.id}
            className="bg-[#1a1a1a] rounded-xl border border-red-600/20 overflow-hidden hover:border-red-600/40 transition-all duration-300 group"
          >
            {/* Imagem do Produto */}
            <div 
              className="aspect-square overflow-hidden bg-[#2a2a2a] cursor-pointer"
              onClick={() => setProdutoSelecionado(produto)}
            >
              {getImagemPrincipal(produto) ? (
                <img
                  src={getImagemPrincipal(produto)}
                  alt={produto.nome}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <span className="text-4xl">📷</span>
                </div>
              )}
            </div>

            {/* Informações do Produto */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 
                  className="font-semibold text-lg text-white line-clamp-2 cursor-pointer hover:text-red-500 transition-colors"
                  onClick={() => setProdutoSelecionado(produto)}
                >
                  {produto.nome}
                </h3>
                {produto.destaque && (
                  <span className="shrink-0 bg-red-600/20 text-red-500 text-xs px-2 py-1 rounded-full">
                    Destaque
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">{produto.descricao}</p>
              
              <div className="space-y-1">
                {produto.preco_promocional ? (
                  <>
                    <p className="text-sm text-gray-500 line-through">
                      {formatarPreco(produto.preco)}
                    </p>
                    <p className="text-lg font-bold text-red-500">
                      {formatarPreco(produto.preco_promocional)}
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-bold text-white">
                    {formatarPreco(produto.preco)}
                  </p>
                )}
              </div>

              <button
                onClick={() => setProdutoSelecionado(produto)}
                className="mt-4 w-full bg-red-600/20 hover:bg-red-600/30 text-red-500 py-2 rounded-lg transition-colors text-sm"
              >
                Ver detalhes
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Detalhes do Produto */}
      {produtoSelecionado && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] p-6 rounded-lg w-full max-w-3xl relative border border-red-600/30">
            <button
              onClick={() => setProdutoSelecionado(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Imagem do Produto */}
              <div className="aspect-square bg-[#2a2a2a] rounded-lg overflow-hidden">
                {getImagemPrincipal(produtoSelecionado) ? (
                  <img
                    src={getImagemPrincipal(produtoSelecionado)}
                    alt={produtoSelecionado.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <span className="text-6xl">📷</span>
                  </div>
                )}
              </div>

              {/* Informações do Produto */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-2xl font-bold text-white">{produtoSelecionado.nome}</h2>
                  {produtoSelecionado.destaque && (
                    <span className="shrink-0 bg-red-600/20 text-red-500 text-xs px-2 py-1 rounded-full">
                      Destaque
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-gray-400">{produtoSelecionado.descricao}</p>
                  
                  {produtoSelecionado.marca && (
                    <p className="text-sm text-gray-500">
                      Marca: <span className="text-white">{produtoSelecionado.marca}</span>
                    </p>
                  )}
                  
                  <p className="text-sm text-gray-500">
                    Categoria: <span className="text-white">{produtoSelecionado.categoria}</span>
                  </p>
                </div>

                <div className="pt-4 border-t border-red-600/20">
                  {produtoSelecionado.preco_promocional ? (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500 line-through">
                        De: {formatarPreco(produtoSelecionado.preco)}
                      </p>
                      <p className="text-3xl font-bold text-red-500">
                        Por: {formatarPreco(produtoSelecionado.preco_promocional)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-3xl font-bold text-white">
                      {formatarPreco(produtoSelecionado.preco)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 