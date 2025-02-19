import { useState, useEffect } from 'react'
import { produtos, type Produto, type CategoriaProduto } from '../../services/produtos'

export default function Produtos() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [produtosLista, setProdutosLista] = useState<Produto[]>([])
  const [destaques, setDestaques] = useState<Produto[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaProduto | 'todos'>('todos')
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)

  const categorias: { id: CategoriaProduto | 'todos', nome: string, icone: string }[] = [
    { id: 'todos', nome: 'Todos', icone: '🛍️' },
    { id: 'cabelo', nome: 'Cabelo', icone: '💇‍♂️' },
    { id: 'barba', nome: 'Barba', icone: '🧔' },
    { id: 'skincare', nome: 'Skincare', icone: '✨' },
    { id: 'perfumaria', nome: 'Perfumaria', icone: '🌺' },
    { id: 'acessorios', nome: 'Acessórios', icone: '✂️' }
  ]

  useEffect(() => {
    const carregarProdutos = async () => {
      setLoading(true)
      setError('')
      try {
        console.log('Iniciando carregamento de produtos...')
        const [todosProdutos, produtosDestaque] = await Promise.all([
          produtos.listar(),
          produtos.listarDestaques()
        ])
        console.log('Produtos carregados:', todosProdutos)
        console.log('Destaques carregados:', produtosDestaque)
        console.log('Produtos com imagens:', todosProdutos.map(p => ({ id: p.id, nome: p.nome, imagens: p.imagens })))
        setProdutosLista(todosProdutos)
        setDestaques(produtosDestaque)
      } catch (err) {
        console.error('Erro ao carregar produtos:', err)
        setError('Erro ao carregar os produtos. Por favor, tente novamente.')
      } finally {
        setLoading(false)
      }
    }

    carregarProdutos()
  }, [])

  const handleCategoria = async (categoria: CategoriaProduto | 'todos') => {
    setLoading(true)
    setCategoriaAtiva(categoria)
    try {
      const data = categoria === 'todos' 
        ? await produtos.listar()
        : await produtos.listarPorCategoria(categoria as CategoriaProduto)
      setProdutosLista(data)
    } catch (err) {
      console.error('Erro ao filtrar produtos:', err)
      setError('Erro ao filtrar os produtos')
    } finally {
      setLoading(false)
    }
  }

  const formatarPreco = (preco: number) => {
    return preco.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  // Função auxiliar para obter a URL da imagem principal
  const getImagemPrincipal = (produto: Produto) => {
    console.log('Obtendo imagem principal para produto:', produto.nome)
    console.log('Imagens disponíveis:', produto.imagens)
    
    if (produto.imagens && produto.imagens.length > 0) {
      const imagemPrincipal = produto.imagens.find(img => img.principal)
      console.log('Imagem principal encontrada:', imagemPrincipal)
      if (imagemPrincipal) return imagemPrincipal.url
      console.log('Usando primeira imagem como fallback')
      return produto.imagens[0].url // Se não houver principal, usa a primeira
    }
    console.log('Nenhuma imagem encontrada, usando placeholder')
    return 'https://via.placeholder.com/300' // Fallback para placeholder
  }

  if (loading && !produtosLista.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Destaques */}
      {destaques.length > 0 && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-600/10 to-red-900/10 border border-red-600/20 p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,0,0,0.1),transparent)]"></div>
          
          <h2 className="text-2xl font-bold text-red-500 mb-6">Produtos em Destaque</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {destaques.map(produto => (
              <div 
                key={produto.id}
                onClick={() => setProdutoSelecionado(produto)}
                className="group relative bg-[#1a1a1a] rounded-lg overflow-hidden cursor-pointer transform hover:scale-[1.02] transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-red-900/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                {/* Imagem */}
                <div className="relative h-48 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                  <img
                    src={getImagemPrincipal(produto)}
                    alt={produto.nome}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                  {produto.preco_promocional && (
                    <div className="absolute top-3 right-3 z-20 bg-red-600 text-white text-sm px-2 py-1 rounded">
                      OFERTA
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">{produto.nome}</h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{produto.descricao}</p>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      {produto.preco_promocional ? (
                        <>
                          <span className="text-gray-400 line-through text-sm">
                            {formatarPreco(produto.preco)}
                          </span>
                          <div className="text-red-500 font-bold">
                            {formatarPreco(produto.preco_promocional)}
                          </div>
                        </>
                      ) : (
                        <div className="text-red-500 font-bold">
                          {formatarPreco(produto.preco)}
                        </div>
                      )}
                    </div>
                    <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors">
                      Comprar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categorias */}
      <div className="flex flex-wrap gap-4">
        {categorias.map(categoria => (
          <button
            key={categoria.id}
            onClick={() => handleCategoria(categoria.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              categoriaAtiva === categoria.id
                ? 'bg-red-600 text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:bg-red-600/10 hover:text-white'
            }`}
          >
            <span>{categoria.icone}</span>
            <span>{categoria.nome}</span>
          </button>
        ))}
      </div>

      {/* Lista de Produtos */}
      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {produtosLista.map(produto => (
            <div 
              key={produto.id}
              onClick={() => setProdutoSelecionado(produto)}
              className="group relative bg-[#1a1a1a] rounded-lg overflow-hidden cursor-pointer transform hover:scale-[1.02] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-red-900/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              {/* Imagem */}
              <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                <img
                  src={getImagemPrincipal(produto)}
                  alt={produto.nome}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                {produto.preco_promocional && (
                  <div className="absolute top-3 right-3 z-20 bg-red-600 text-white text-sm px-2 py-1 rounded">
                    OFERTA
                  </div>
                )}
              </div>

              {/* Conteúdo */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-1 rounded bg-red-600/20 text-red-500">
                    {categorias.find(cat => cat.id === produto.categoria)?.nome}
                  </span>
                  {produto.marca && (
                    <span className="text-xs px-2 py-1 rounded bg-[#2a2a2a] text-gray-400">
                      {produto.marca}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">{produto.nome}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{produto.descricao}</p>
                
                <div className="flex items-end justify-between">
                  <div>
                    {produto.preco_promocional ? (
                      <>
                        <span className="text-gray-400 line-through text-sm">
                          {formatarPreco(produto.preco)}
                        </span>
                        <div className="text-red-500 font-bold">
                          {formatarPreco(produto.preco_promocional)}
                        </div>
                      </>
                    ) : (
                      <div className="text-red-500 font-bold">
                        {formatarPreco(produto.preco)}
                      </div>
                    )}
                  </div>
                  <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors">
                    Comprar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes do Produto */}
      {produtoSelecionado && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl w-full max-w-4xl relative border border-red-600/20">
            <button
              onClick={() => setProdutoSelecionado(null)}
              className="absolute -top-4 -right-4 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
            >
              ×
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              {/* Imagem */}
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={getImagemPrincipal(produtoSelecionado)}
                  alt={produtoSelecionado.nome}
                  className="w-full h-full object-cover"
                />
                {produtoSelecionado.preco_promocional && (
                  <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded">
                    OFERTA
                  </div>
                )}
              </div>

              {/* Informações */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm px-2 py-1 rounded bg-red-600/20 text-red-500">
                      {categorias.find(cat => cat.id === produtoSelecionado.categoria)?.nome}
                    </span>
                    {produtoSelecionado.marca && (
                      <span className="text-sm px-2 py-1 rounded bg-[#2a2a2a] text-gray-400">
                        {produtoSelecionado.marca}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{produtoSelecionado.nome}</h2>
                  <p className="text-gray-400">{produtoSelecionado.descricao}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    {produtoSelecionado.preco_promocional ? (
                      <>
                        <span className="text-gray-400 line-through text-lg">
                          {formatarPreco(produtoSelecionado.preco)}
                        </span>
                        <div className="text-red-500 font-bold text-3xl">
                          {formatarPreco(produtoSelecionado.preco_promocional)}
                        </div>
                      </>
                    ) : (
                      <div className="text-red-500 font-bold text-3xl">
                        {formatarPreco(produtoSelecionado.preco)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-[#2a2a2a] rounded-lg p-2">
                      <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={produtoSelecionado.estoque}
                        defaultValue="1"
                        className="w-12 text-center bg-transparent text-white"
                      />
                      <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                        +
                      </button>
                    </div>

                    <button className="flex-1 bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-lg hover:from-red-700 hover:to-red-900 transition-all duration-300 font-medium">
                      Adicionar ao Carrinho
                    </button>
                  </div>
                </div>

                {/* Informações Adicionais */}
                <div className="pt-6 border-t border-red-600/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-gray-400 text-sm">Disponibilidade</p>
                      <p className="text-white">
                        {produtoSelecionado.estoque > 0 
                          ? `${produtoSelecionado.estoque} em estoque`
                          : 'Fora de estoque'
                        }
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-400 text-sm">Código</p>
                      <p className="text-white">{produtoSelecionado.id.slice(0, 8)}</p>
                    </div>
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