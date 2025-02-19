import { useState, useEffect } from 'react'
import { servicoService, storageService } from '../../services/admin'
import { motion, AnimatePresence } from 'framer-motion'
import ConfirmationModal from '../ConfirmationModal'

interface Servico {
  id: string
  nome: string
  descricao: string
  preco: number
  duracao_minutos: number
  foto_url: string | null
  categoria: 'barbearia' | 'salao'
  status: boolean
  created_at?: string
  updated_at?: string
}

export default function Servicos() {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [servicoEmEdicao, setServicoEmEdicao] = useState<Servico | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [servicoParaExcluir, setServicoParaExcluir] = useState<Servico | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | 'barbearia' | 'salao'>('todos')
  
  const [novoServico, setNovoServico] = useState({
    nome: '',
    descricao: '',
    preco: '',
    duracao_minutos: '',
    foto_url: '',
    categoria: 'barbearia' as 'barbearia' | 'salao',
    status: true
  })

  useEffect(() => {
    carregarServicos()
  }, [])

  const carregarServicos = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { data, error } = await servicoService.listar()
      if (error) throw error
      
      setServicos(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao carregar serviços:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setError('')

    try {
      if (!novoServico.nome || !novoServico.preco || !novoServico.duracao_minutos) {
        throw new Error('Por favor, preencha todos os campos obrigatórios')
      }

      const servicoData = {
        nome: novoServico.nome,
        descricao: novoServico.descricao || '',
        preco: parseFloat(novoServico.preco),
        duracao_minutos: parseInt(novoServico.duracao_minutos),
        foto_url: novoServico.foto_url || undefined,
        categoria: novoServico.categoria,
        status: novoServico.status
      }

      if (servicoEmEdicao) {
        const { error } = await servicoService.atualizar(servicoEmEdicao.id, servicoData)
        if (error) throw error
      } else {
        const { error } = await servicoService.criar(servicoData)
        if (error) throw error
      }

      await carregarServicos()
      setModalAberto(false)
      setServicoEmEdicao(null)
      setNovoServico({
        nome: '',
        descricao: '',
        preco: '',
        duracao_minutos: '',
        foto_url: '',
        categoria: 'barbearia',
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
      
      const result = await storageService.upload('servicos', fileName, file)
      if (!result) throw new Error('Erro ao fazer upload da foto')

      const url = await storageService.getPublicUrl('servicos', result.path)
      if (!url) throw new Error('Erro ao obter URL da foto')

      setNovoServico(prev => ({ ...prev, foto_url: url }))
    } catch (err: any) {
      setError('Erro ao fazer upload da foto: ' + err.message)
      console.error('Erro ao fazer upload:', err)
    } finally {
      setUploadingFoto(false)
    }
  }

  const handleExcluir = async (servico: Servico) => {
    setServicoParaExcluir(servico)
    setConfirmationOpen(true)
  }

  const confirmarExclusao = async () => {
    if (!servicoParaExcluir) return
    
    setError('')
    
    try {
      const { error } = await servicoService.excluir(servicoParaExcluir.id)
      if (error) throw error
      
      await carregarServicos()
      setConfirmationOpen(false)
      setServicoParaExcluir(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao excluir serviço:', err)
    }
  }

  const servicosFiltrados = servicos.filter(servico => 
    filtroCategoria === 'todos' || servico.categoria === filtroCategoria
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
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-red-500">Serviços</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value as typeof filtroCategoria)}
            className="bg-[#2a2a2a] border border-red-600/20 rounded-lg px-4 py-2 text-white focus:border-red-600 focus:outline-none text-sm"
          >
            <option value="todos">Todos</option>
            <option value="barbearia">Barbearia</option>
            <option value="salao">Salão</option>
          </select>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setServicoEmEdicao(null)
              setModalAberto(true)
              setNovoServico({
                nome: '',
                descricao: '',
                preco: '',
                duracao_minutos: '',
                foto_url: '',
                categoria: 'barbearia',
                status: true
              })
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-900 transition-all whitespace-nowrap flex-shrink-0"
          >
            <span>+</span>
            <span>Adicionar Serviço</span>
          </motion.button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}
      
      {/* Grid de Serviços */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {servicosFiltrados.map((servico, index) => (
            <motion.div
              key={servico.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-red-600/20 overflow-hidden hover:border-red-600/40 transition-all group"
            >
              {/* Imagem do Serviço */}
              <div className="aspect-video relative overflow-hidden bg-[#2a2a2a]">
                {servico.foto_url ? (
                  <img 
                    src={servico.foto_url} 
                    alt={servico.nome}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-red-600/20">
                    <span className="text-4xl font-bold text-red-600/40">
                      {servico.nome.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    servico.status 
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {servico.status ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs bg-white/10 text-white backdrop-blur-sm">
                    {servico.categoria === 'barbearia' ? 'Barbearia' : 'Salão'}
                  </span>
                </div>
              </div>

              {/* Informações do Serviço */}
              <div className="p-4">
                <h3 className="font-semibold text-lg text-white mb-2">{servico.nome}</h3>
                {servico.descricao && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{servico.descricao}</p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>{servico.duracao_minutos} minutos</span>
                  <span className="font-medium text-white">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(servico.preco)}
                  </span>
                </div>
              </div>

              {/* Ações */}
              <div className="p-4 pt-0 flex justify-end gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setServicoEmEdicao(servico)
                    setNovoServico({
                      nome: servico.nome,
                      descricao: servico.descricao,
                      preco: servico.preco.toString(),
                      duracao_minutos: servico.duracao_minutos.toString(),
                      foto_url: servico.foto_url || '',
                      categoria: servico.categoria,
                      status: servico.status
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
                  onClick={() => handleExcluir(servico)}
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
                  setServicoEmEdicao(null)
                  setNovoServico({
                    nome: '',
                    descricao: '',
                    preco: '',
                    duracao_minutos: '',
                    foto_url: '',
                    categoria: 'barbearia',
                    status: true
                  })
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>

              <h3 className="text-xl font-bold text-red-500 mb-6">
                {servicoEmEdicao ? 'Editar Serviço' : 'Novo Serviço'}
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
                    value={novoServico.nome}
                    onChange={e => setNovoServico(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Descrição</label>
                  <textarea
                    value={novoServico.descricao}
                    onChange={e => setNovoServico(prev => ({ ...prev, descricao: e.target.value }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Categoria *</label>
                  <select
                    value={novoServico.categoria}
                    onChange={e => setNovoServico(prev => ({ ...prev, categoria: e.target.value as 'barbearia' | 'salao' }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  >
                    <option value="barbearia">Barbearia</option>
                    <option value="salao">Salão</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={novoServico.preco}
                    onChange={e => setNovoServico(prev => ({ ...prev, preco: e.target.value }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Duração (minutos) *</label>
                  <input
                    type="number"
                    min="1"
                    value={novoServico.duracao_minutos}
                    onChange={e => setNovoServico(prev => ({ ...prev, duracao_minutos: e.target.value }))}
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
                  {novoServico.foto_url && (
                    <div className="mt-2">
                      <img
                        src={novoServico.foto_url}
                        alt="Preview"
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={novoServico.status}
                    onChange={e => setNovoServico(prev => ({ ...prev, status: e.target.checked }))}
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
                    servicoEmEdicao ? 'Atualizar' : 'Adicionar'
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
          setServicoParaExcluir(null)
        }}
        onConfirm={confirmarExclusao}
        title="Excluir Serviço"
        message={`Tem certeza que deseja excluir o serviço "${servicoParaExcluir?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  )
} 