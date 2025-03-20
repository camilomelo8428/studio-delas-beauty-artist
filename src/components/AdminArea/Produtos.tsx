import { useState, useEffect } from 'react'
import { produtoService, storageService } from '../../services/admin/index'
import { motion, AnimatePresence } from 'framer-motion'
import ConfirmationModal from '../ConfirmationModal'

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

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(null)
  
  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    descricao: '',
    preco: '',
    estoque: '',
    foto_url: '',
    categoria: '',
    status: true
  })

  useEffect(() => {
    carregarProdutos()
  }, [])

  const carregarProdutos = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { data, error } = await produtoService.listar()
      if (error) throw error
      
      setProdutos(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao carregar produtos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setError('')

    try {
      if (!novoProduto.nome || !novoProduto.preco || !novoProduto.estoque || !novoProduto.categoria) {
        throw new Error('Por favor, preencha todos os campos obrigatórios')
      }

      const produtoData = {
        nome: novoProduto.nome,
        descricao: novoProduto.descricao || '',
        preco: parseFloat(novoProduto.preco),
        estoque: parseInt(novoProduto.estoque),
        foto_url: novoProduto.foto_url || null,
        categoria: novoProduto.categoria,
        status: novoProduto.status
      }

      if (produtoEmEdicao) {
        const { error } = await produtoService.atualizar(produtoEmEdicao.id, produtoData)
        if (error) throw error
      } else {
        const { error } = await produtoService.criar(produtoData)
        if (error) throw error
      }

      await carregarProdutos()
      setModalAberto(false)
      setProdutoEmEdicao(null)
      setNovoProduto({
        nome: '',
        descricao: '',
        preco: '',
        estoque: '',
        foto_url: '',
        categoria: '',
        status: true
      })
    } catch (err: any) {
      console.error('Erro detalhado:', err)
      setError(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    
    setUploadingFoto(true)
    setError('')

    try {
      const file = e.target.files[0]
      const fileName = `${Date.now()}-${file.name}`
      
      const result = await storageService.upload('produtos', fileName, file)
      if (!result) throw new Error('Erro ao fazer upload da foto')

      const url = await storageService.getPublicUrl('produtos', result.path)
      if (!url) throw new Error('Erro ao obter URL da foto')

      setNovoProduto(prev => ({ ...prev, foto_url: url }))
    } catch (err: any) {
      setError('Erro ao fazer upload da foto: ' + err.message)
      console.error('Erro ao fazer upload:', err)
    } finally {
      setUploadingFoto(false)
    }
  }

  const handleExcluir = async (produto: Produto) => {
    setProdutoParaExcluir(produto)
    setConfirmationOpen(true)
  }

  const confirmarExclusao = async () => {
    if (!produtoParaExcluir) return
    
    setError('')
    
    try {
      const { error } = await produtoService.excluir(produtoParaExcluir.id)
      if (error) throw error
      
      await carregarProdutos()
      setConfirmationOpen(false)
      setProdutoParaExcluir(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao excluir produto:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-red-500">Produtos</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setProdutoEmEdicao(null)
              setModalAberto(true)
              setNovoProduto({
                nome: '',
                descricao: '',
                preco: '',
                estoque: '',
                foto_url: '',
                categoria: '',
                status: true
              })
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-900 transition-all whitespace-nowrap flex-shrink-0"
          >
            <span>+</span>
            <span>Adicionar Produto</span>
          </motion.button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}
      
      {/* Grid de Produtos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {produtos.map((produto, index) => (
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
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    produto.status 
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {produto.status ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs bg-white/10 text-white backdrop-blur-sm">
                    {produto.categoria}
                  </span>
                </div>
              </div>

              {/* Informações do Produto */}
              <div className="p-4">
                <h3 className="font-semibold text-lg text-white mb-2">{produto.nome}</h3>
                {produto.descricao && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{produto.descricao}</p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>Estoque: {produto.estoque}</span>
                  <span className="font-medium text-white">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(produto.preco)}
                  </span>
                </div>
              </div>

              {/* Ações */}
              <div className="p-4 pt-0 flex justify-end gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setProdutoEmEdicao(produto)
                    setNovoProduto({
                      nome: produto.nome,
                      descricao: produto.descricao,
                      preco: produto.preco.toString(),
                      estoque: produto.estoque.toString(),
                      foto_url: produto.foto_url || '',
                      categoria: produto.categoria,
                      status: produto.status
                    })
                    setModalAberto(true)
                  }}
                  className="text-blue-500 hover:text-blue-400 transition-colors"
                >
                  Editar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleExcluir(produto)}
                  className="text-red-500 hover:text-red-400 transition-colors"
                >
                  Excluir
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal de Formulário */}
      <AnimatePresence>
        {modalAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] p-6 rounded-xl w-full max-w-md relative border border-red-600/30 shadow-xl"
            >
              <button
                onClick={() => {
                  setModalAberto(false)
                  setProdutoEmEdicao(null)
                  setNovoProduto({
                    nome: '',
                    descricao: '',
                    preco: '',
                    estoque: '',
                    foto_url: '',
                    categoria: '',
                    status: true
                  })
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>

              <h3 className="text-xl font-bold text-red-500 mb-6">
                {produtoEmEdicao ? 'Editar Produto' : 'Novo Produto'}
              </h3>

              {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Nome *</label>
                  <input
                    type="text"
                    value={novoProduto.nome}
                    onChange={e => setNovoProduto(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Descrição</label>
                  <textarea
                    value={novoProduto.descricao}
                    onChange={e => setNovoProduto(prev => ({ ...prev, descricao: e.target.value }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Categoria *</label>
                  <input
                    type="text"
                    value={novoProduto.categoria}
                    onChange={e => setNovoProduto(prev => ({ ...prev, categoria: e.target.value }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={novoProduto.preco}
                    onChange={e => setNovoProduto(prev => ({ ...prev, preco: e.target.value }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Estoque *</label>
                  <input
                    type="number"
                    min="0"
                    value={novoProduto.estoque}
                    onChange={e => setNovoProduto(prev => ({ ...prev, estoque: e.target.value }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Foto</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFoto}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    disabled={uploadingFoto}
                  />
                  {uploadingFoto && (
                    <p className="text-sm text-gray-400 mt-2">Fazendo upload...</p>
                  )}
                  {novoProduto.foto_url && (
                    <div className="mt-2">
                      <img
                        src={novoProduto.foto_url}
                        alt="Preview"
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={novoProduto.status}
                    onChange={e => setNovoProduto(prev => ({ ...prev, status: e.target.checked }))}
                    className="w-4 h-4 rounded border-red-600/20 text-red-600 focus:ring-red-600"
                  />
                  <label className="text-gray-400 text-sm">Ativo</label>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={salvando || uploadingFoto}
                  className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white px-4 py-3 rounded-lg hover:from-red-700 hover:to-red-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {salvando ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </div>
                  ) : (
                    produtoEmEdicao ? 'Atualizar' : 'Adicionar'
                  )}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmationModal
        isOpen={confirmationOpen}
        onClose={() => {
          setConfirmationOpen(false)
          setProdutoParaExcluir(null)
        }}
        onConfirm={confirmarExclusao}
        title="Excluir Produto"
        message={`Tem certeza que deseja excluir o produto "${produtoParaExcluir?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  )
} 