import { useState, useEffect } from 'react'
import { produtos as produtosService } from '../../services/produtos'
import type { Produto, CategoriaProduto } from '../../services/produtos'
import { motion, AnimatePresence } from 'framer-motion'

const CATEGORIAS: { id: CategoriaProduto | 'todos', nome: string, icone: string }[] = [
  { id: 'todos', nome: 'Todos', icone: '🎯' },
  { id: 'cabelo', nome: 'Cabelo', icone: '💇‍♀️' },
  { id: 'estetica', nome: 'Estética', icone: '✨' },
  { id: 'manicure', nome: 'Manicure & Pedicure', icone: '💅' },
  { id: 'maquiagem', nome: 'Maquiagem', icone: '💄' },
  { id: 'depilacao', nome: 'Depilação', icone: '🌟' },
  { id: 'massagem', nome: 'Massagem', icone: '💆‍♀️' },
  { id: 'sobrancelhas', nome: 'Sobrancelhas', icone: '👁️' },
  { id: 'tratamentos', nome: 'Tratamentos', icone: '⭐' }
]

export default function Produtos() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [produtosLista, setProdutosLista] = useState<Produto[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaProduto | 'todos'>('todos')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    carregarProdutos()
  }, [])

  const carregarProdutos = async () => {
    setLoading(true)
    setError('')
    
    try {
      const data = await produtosService.listar()
      setProdutosLista(data)
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao carregar produtos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoria = async (categoria: CategoriaProduto | 'todos') => {
    setCategoriaAtiva(categoria)
    setLoading(true)
    setError('')

    try {
      if (categoria === 'todos') {
        const data = await produtosService.listar()
        setProdutosLista(data)
      } else {
        const data = await produtosService.listarPorCategoria(categoria)
        setProdutosLista(data)
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao filtrar produtos:', err)
    } finally {
      setLoading(false)
    }
  }

  const produtosFiltrados = produtosLista.filter(produto =>
    produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Barra de Busca */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 Buscar produtos..."
          className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg px-4 py-2 text-white focus:border-red-600 focus:outline-none"
        />
        <span className="absolute right-4 top-2 text-gray-400">
          {produtosFiltrados.length} produtos encontrados
        </span>
      </div>

      {/* Categorias */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-red-600/20 scrollbar-track-transparent">
        {CATEGORIAS.map(categoria => (
          <button
            key={categoria.id}
            onClick={() => handleCategoria(categoria.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
              categoriaAtiva === categoria.id
                ? 'bg-red-600 text-white'
                : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
            }`}
          >
            <span className="text-lg">{categoria.icone}</span>
            <span>{categoria.nome}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {/* Grid de Produtos */}
      {produtosFiltrados.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {produtosFiltrados.map((produto, index) => (
              <motion.div
                key={produto.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-red-600/20 overflow-hidden hover:border-red-600/40 transition-all group"
              >
                {/* Imagem do Produto */}
                <div className="aspect-video relative overflow-hidden bg-[#2a2a2a]">
                  {produto.foto_url ? (
                    <img 
                      src={produto.foto_url} 
                      alt={produto.nome}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-red-600/20">
                      <span className="text-4xl font-bold text-red-600/40">
                        {produto.nome.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Informações do Produto */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-white mb-2">{produto.nome}</h3>
                  {produto.descricao && (
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{produto.descricao}</p>
                  )}

                  {/* Informações de Promoção */}
                  {produto.promocao_ativa && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-red-500">🔥</span>
                        <span className="text-sm font-medium text-red-500">Promoção</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex flex-col">
                          <span className="text-gray-400">De: <span className="line-through">{new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(produto.preco)}</span></span>
                          <span className="text-red-500 font-bold">Por: {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(produto.preco_promocional || 0)}</span>
                        </div>
                        <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                          {Math.round((1 - ((produto.preco_promocional || 0) / produto.preco)) * 100)}% OFF
                        </div>
                      </div>
                      {produto.promocao_descricao && (
                        <p className="mt-2 text-xs text-red-400">{produto.promocao_descricao}</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span className="font-medium text-white">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(produto.preco)}
                    </span>
                  </div>
                </div>

                {/* Botão de Compra */}
                <div className="p-4 pt-0">
                  <button
                    onClick={() => {/* Implementar lógica de compra */}}
                    className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-900 transition-all"
                  >
                    Comprar
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
} 