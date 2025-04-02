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
  const [termoBusca, setTermoBusca] = useState('')

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
    const matchBusca = produto.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
                      produto.descricao.toLowerCase().includes(termoBusca.toLowerCase()) ||
                      produto.marca.toLowerCase().includes(termoBusca.toLowerCase())
    return matchBusca
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
              placeholder="Buscar serviços e produtos..."
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-red-600/40"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>

          {/* Contador de Produtos */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400">
            <span>{produtosFiltrados.length}</span>
            <span>itens encontrados</span>
          </div>
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
              <div className="relative aspect-[4/3] overflow-hidden bg-[#2a2a2a]">
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
                <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
                  {produto.destaque && (
                    <span className="px-3 py-1 bg-red-600 text-white text-xs rounded-full shadow-lg">
                      Destaque
                    </span>
                  )}
                  {produto.preco_promocional && (
                    <span className="px-3 py-1 bg-green-600 text-white text-xs rounded-full shadow-lg animate-pulse">
                      {Math.round((1 - (produto.preco_promocional / produto.preco)) * 100)}% OFF
                    </span>
                  )}
                </div>
              </div>

              {/* Informações */}
              <div className="p-4">
                <div className="mb-2">
                  <h3 className="text-lg font-semibold text-white line-clamp-1 group-hover:text-red-500 transition-colors">
                    {produto.nome}
                  </h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                    {produto.descricao}
                  </p>
                </div>

                {/* Marca */}
                {produto.marca && (
                  <div className="mb-3">
                    <span className="text-xs px-2 py-1 bg-[#2a2a2a] text-gray-400 rounded">
                      {produto.marca}
                    </span>
                  </div>
                )}

                {/* Preço e Botão */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div className="flex-1">
                    {produto.preco_promocional ? (
                      <>
                        <p className="text-xs text-gray-500 line-through">
                          {formatarPreco(produto.preco)}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold text-red-500">
                            {formatarPreco(produto.preco_promocional)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-lg font-bold text-white">
                        {formatarPreco(produto.preco)}
                      </p>
                    )}
                  </div>
                  <button className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-red-600/20 text-red-500 text-sm rounded-lg hover:bg-red-600/10 transition-colors flex items-center justify-center sm:justify-start gap-2">
                    <span>Saiba mais</span>
                    <span className="text-lg">✨</span>
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
          <div className="bg-[#1a1a1a] w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl rounded-none md:rounded-xl border-y md:border border-red-600/20 relative overflow-y-auto">
            {/* Header Fixo */}
            <div className="sticky top-0 z-50 bg-[#1a1a1a] border-b border-red-600/20 p-4 flex items-center justify-between">
              <button
                onClick={() => setProdutoSelecionado(null)}
                className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <span className="text-xl">←</span>
                <span>Voltar</span>
              </button>
              <h2 className="text-lg font-semibold text-white">Detalhes do Produto</h2>
              <div className="w-20"></div>
            </div>

            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* Coluna da Esquerda - Imagens */}
                <div className="space-y-4">
                  {/* Imagem Principal */}
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
                        <span className="px-3 py-1 bg-red-600 text-white text-sm rounded-full shadow-lg">
                          Destaque
                        </span>
                      )}
                      {produtoSelecionado.preco_promocional && (
                        <span className="px-3 py-1 bg-green-600 text-white text-sm rounded-full shadow-lg animate-pulse">
                          {Math.round((1 - (produtoSelecionado.preco_promocional / produtoSelecionado.preco)) * 100)}% OFF
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Galeria de Miniaturas */}
                  {produtoSelecionado.imagens && produtoSelecionado.imagens.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {produtoSelecionado.imagens.map((imagem) => (
                        <div
                          key={imagem.id}
                          className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 ${
                            imagem.principal ? 'border-red-600' : 'border-transparent'
                          }`}
                        >
                          <img
                            src={imagem.url}
                            alt={produtoSelecionado.nome}
                            className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Coluna da Direita - Informações */}
                <div className="space-y-6">
                  {/* Cabeçalho */}
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {produtoSelecionado.nome}
                    </h2>
                    <p className="text-gray-400">
                      {produtoSelecionado.descricao}
                    </p>
                  </div>

                  {/* Marca e Categoria */}
                  <div className="grid grid-cols-2 gap-4">
                    {produtoSelecionado.marca && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Marca</p>
                        <span className="px-3 py-1 bg-[#2a2a2a] text-white rounded inline-block">
                          {produtoSelecionado.marca}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Preço e Promoção */}
                  <div className="bg-[#2a2a2a] rounded-lg p-4">
                    {produtoSelecionado.preco_promocional ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-3xl font-bold text-red-500">
                            {formatarPreco(produtoSelecionado.preco_promocional)}
                          </span>
                          <span className="text-lg text-gray-500 line-through">
                            {formatarPreco(produtoSelecionado.preco)}
                          </span>
                          <span className="px-2 py-1 bg-red-600 text-white text-sm rounded-full">
                            {Math.round((1 - (produtoSelecionado.preco_promocional / produtoSelecionado.preco)) * 100)}% OFF
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          Economize {formatarPreco(produtoSelecionado.preco - produtoSelecionado.preco_promocional)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-3xl font-bold text-white">
                        {formatarPreco(produtoSelecionado.preco)}
                      </span>
                    )}
                  </div>

                  {/* Informações Adicionais */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 mb-1">Código do Produto</p>
                      <p className="text-white font-mono bg-[#2a2a2a] px-3 py-1 rounded">
                        {produtoSelecionado.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Status</p>
                      <span className={`inline-block px-3 py-1 rounded ${
                        produtoSelecionado.status
                          ? 'bg-green-600/20 text-green-500'
                          : 'bg-red-600/20 text-red-500'
                      }`}>
                        {produtoSelecionado.status ? 'Disponível' : 'Indisponível'}
                      </span>
                    </div>
                  </div>

                  {/* Seção Venha nos Conhecer */}
                  <div className="bg-gradient-to-r from-red-600/10 to-red-900/10 rounded-lg p-6 border border-red-600/20">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center text-2xl">
                        ✨
                      </div>
                      <h3 className="text-xl font-semibold text-white">Venha nos Conhecer!</h3>
                    </div>
                    
                    <p className="text-gray-300 mb-4">
                      Gostaríamos de convidá-lo(a) para conhecer pessoalmente este e outros produtos/serviços exclusivos em nosso estabelecimento. Nossa equipe especializada está pronta para oferecer um atendimento personalizado e tirar todas as suas dúvidas.
                    </p>
                    
                    <div className="flex flex-col gap-3 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">📍</span>
                        <span>Visite nosso espaço e descubra uma experiência única</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">💆‍♀️</span>
                        <span>Atendimento personalizado e profissional</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">🎁</span>
                        <span>Condições especiais para sua primeira visita</span>
                      </div>
                    </div>
                  </div>

                  {/* Botão de Fechar Mobile */}
                  <button
                    onClick={() => setProdutoSelecionado(null)}
                    className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors md:hidden flex items-center justify-center gap-2"
                  >
                    <span>Voltar para a lista</span>
                    <span>←</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 