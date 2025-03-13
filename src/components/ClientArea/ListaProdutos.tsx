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
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('todos')
  const [termoBusca, setTermoBusca] = useState('')

  const categorias = [
    { id: 'todos', nome: 'Todos', icone: '🛍️' },
    { id: 'cabelo', nome: 'Cabelo', icone: '💇‍♂️' },
    { id: 'barba', nome: 'Barba', icone: '🧔' },
    { id: 'skincare', nome: 'Skincare', icone: '✨' },
    { id: 'perfumaria', nome: 'Perfumaria', icone: '🌺' },
    { id: 'acessorios', nome: 'Acessórios', icone: '✂️' }
  ]

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
      const imagemPrincipal = produto.imagens.find(img => img.principal)
      if (imagemPrincipal) return imagemPrincipal.url
      return produto.imagens[0].url
    }
    return produto.foto_url || undefined
  }

  const produtosFiltrados = produtos.filter(produto => {
    const matchCategoria = categoriaSelecionada === 'todos' || produto.categoria === categoriaSelecionada
    const matchBusca = produto.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
                      produto.descricao.toLowerCase().includes(termoBusca.toLowerCase()) ||
                      produto.marca.toLowerCase().includes(termoBusca.toLowerCase())
    return matchCategoria && matchBusca
  })

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-red-600/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-red-600 border-t-transparent animate-spin"></div>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500">{erro}</p>
          <button
            onClick={carregarProdutos}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Barra de Busca e Filtros */}
      <div className="sticky top-0 z-30 bg-[#1a1a1a] border-b border-red-600/20 p-4 backdrop-blur-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Barra de Busca */}
          <div className="relative flex-1">
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Buscar produtos..."
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-red-600/40"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>

          {/* Contador de Produtos */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400">
            <span>{produtosFiltrados.length}</span>
            <span>produtos encontrados</span>
          </div>
        </div>

        {/* Categorias */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-red-600/30 scrollbar-track-transparent">
          {categorias.map(categoria => (
            <button
              key={categoria.id}
              onClick={() => setCategoriaSelecionada(categoria.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                categoriaSelecionada === categoria.id
                  ? 'bg-red-600 text-white'
                  : 'bg-[#2a2a2a] text-gray-400 hover:bg-red-600/10 hover:text-white'
              }`}
            >
              <span>{categoria.icone}</span>
              <span>{categoria.nome}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Produtos */}
      {produtosFiltrados.length === 0 ? (
        <div className="min-h-[200px] flex items-center justify-center text-gray-400">
          Nenhum produto encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {produtosFiltrados.map((produto) => (
            <div
              key={produto.id}
              onClick={() => setProdutoSelecionado(produto)}
              className="group bg-[#1a1a1a] rounded-xl border border-red-600/20 overflow-hidden hover:border-red-600/40 transition-all duration-300 cursor-pointer"
            >
              {/* Imagem */}
              <div className="relative aspect-[4/3] md:aspect-square overflow-hidden bg-[#2a2a2a]">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10"></div>
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
                
                {/* Tags */}
                <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
                  {produto.destaque && (
                    <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                      Destaque
                    </span>
                  )}
                  {produto.preco_promocional && (
                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                      Promoção
                    </span>
                  )}
                </div>
              </div>

              {/* Informações */}
              <div className="p-3 md:p-4">
                <div className="mb-2">
                  <h3 className="text-base md:text-lg font-semibold text-white line-clamp-1 group-hover:text-red-500 transition-colors">
                    {produto.nome}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-400 line-clamp-2 mt-1">
                    {produto.descricao}
                  </p>
                </div>

                {/* Marca e Categoria */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {produto.marca && (
                    <span className="text-xs px-2 py-0.5 bg-[#2a2a2a] text-gray-400 rounded">
                      {produto.marca}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 bg-red-600/20 text-red-500 rounded">
                    {categorias.find(cat => cat.id === produto.categoria)?.nome}
                  </span>
                </div>

                {/* Preço e Botão */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    {produto.preco_promocional ? (
                      <>
                        <p className="text-xs text-gray-500 line-through">
                          {formatarPreco(produto.preco)}
                        </p>
                        <p className="text-base md:text-lg font-bold text-red-500">
                          {formatarPreco(produto.preco_promocional)}
                        </p>
                      </>
                    ) : (
                      <p className="text-base md:text-lg font-bold text-white">
                        {formatarPreco(produto.preco)}
                      </p>
                    )}
                  </div>
                  <button className="shrink-0 px-3 py-1.5 bg-red-600/20 text-red-500 text-sm rounded-lg hover:bg-red-600/30 transition-colors">
                    Ver mais
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes */}
      {produtoSelecionado && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-[#1a1a1a] w-full h-full md:h-auto md:max-w-4xl md:rounded-xl border-y md:border border-red-600/20 relative">
            {/* Botão Fechar */}
            <button
              onClick={() => setProdutoSelecionado(null)}
              className="fixed md:absolute top-4 right-4 md:-top-4 md:-right-4 w-10 h-10 md:w-8 md:h-8 bg-red-600 text-white text-xl md:text-base rounded-full flex items-center justify-center hover:bg-red-700 transition-colors z-50"
            >
              ×
            </button>

            {/* Cabeçalho Mobile */}
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-red-600/20 p-4 md:hidden z-40">
              <h2 className="text-xl font-bold text-white">
                {produtoSelecionado.nome}
              </h2>
            </div>

            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* Imagem */}
                <div className="relative aspect-square rounded-lg overflow-hidden bg-[#2a2a2a]">
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

                  {/* Tags */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    {produtoSelecionado.destaque && (
                      <span className="px-3 py-1 bg-gold-600 text-white text-sm rounded-full">
                        Destaque
                      </span>
                    )}
                    {produtoSelecionado.preco_promocional && (
                      <span className="px-3 py-1 bg-green-600 text-white text-sm rounded-full">
                        Promoção
                      </span>
                    )}
                  </div>
                </div>

                {/* Informações */}
                <div className="space-y-6">
                  {/* Título Desktop */}
                  <h2 className="hidden md:block text-2xl font-bold text-white mb-2">
                    {produtoSelecionado.nome}
                  </h2>

                  <div>
                    <p className="text-gray-400 text-base">
                      {produtoSelecionado.descricao}
                    </p>
                  </div>

                  {/* Marca e Categoria */}
                  <div className="flex gap-4">
                    {produtoSelecionado.marca && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Marca</p>
                        <span className="px-3 py-1 bg-[#2a2a2a] text-white rounded">
                          {produtoSelecionado.marca}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Categoria</p>
                      <span className="px-3 py-1 bg-red-600/20 text-red-500 rounded">
                        {categorias.find(cat => cat.id === produtoSelecionado.categoria)?.nome}
                      </span>
                    </div>
                  </div>

                  {/* Preço */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    {produtoSelecionado.preco_promocional ? (
                      <>
                        <span className="text-2xl font-bold text-gold-500">
                          {formatarPreco(produtoSelecionado.preco_promocional)}
                        </span>
                        <span className="text-lg text-gray-500 line-through">
                          {formatarPreco(produtoSelecionado.preco)}
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-gold-500">
                        {formatarPreco(produtoSelecionado.preco)}
                      </span>
                    )}
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-3 pt-4">
                    <button className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors">
                      Comprar agora
                    </button>
                    <button className="flex-1 border border-red-600/20 text-red-500 py-3 rounded-lg hover:bg-red-600/10 transition-colors">
                      Adicionar ao carrinho
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 