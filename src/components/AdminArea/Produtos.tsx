import { useState, useEffect } from 'react'
import { produtos, type Produto, type CategoriaProduto, type ProdutoImagem } from '../../services/produtos'
import { supabase } from '../../lib/supabase'
import ConfirmationModal from '../ConfirmationModal'

export default function Produtos() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [produtosLista, setProdutosLista] = useState<Produto[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null)
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [imagensTemp, setImagensTemp] = useState<ProdutoImagem[]>([])

  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    descricao: '',
    preco: 0,
    preco_promocional: null as number | null,
    estoque: 0,
    categoria: 'cabelo' as CategoriaProduto,
    marca: '',
    destaque: false,
    status: true
  })

  useEffect(() => {
    carregarProdutos()
  }, [])

  const carregarProdutos = async () => {
    setLoading(true)
    try {
      const data = await produtos.listar()
      setProdutosLista(data)
    } catch (err) {
      console.error('Erro ao carregar produtos:', err)
      setError('Erro ao carregar os produtos')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return

    setUploadingFoto(true)
    try {
      const file = e.target.files[0]
      const url = await produtos.uploadFoto(file)
      
      // Adiciona a nova imagem à lista temporária
      const novaImagem: ProdutoImagem = {
        id: `temp-${Date.now()}`, // ID temporário
        produto_id: produtoEmEdicao?.id || '',
        url: url,
        ordem: imagensTemp.length,
        principal: imagensTemp.length === 0, // Primeira imagem é principal por padrão
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      setImagensTemp(prev => [...prev, novaImagem])
    } catch (err) {
      console.error('Erro ao fazer upload da foto:', err)
      setError('Erro ao fazer upload da foto')
    } finally {
      setUploadingFoto(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (produtoEmEdicao) {
        // Atualiza o produto
        await produtos.atualizar(produtoEmEdicao.id, novoProduto)
        
        // Atualiza as imagens
        for (const imagem of imagensTemp) {
          if (imagem.id.startsWith('temp-')) {
            // Nova imagem
            await produtos.adicionarImagem(produtoEmEdicao.id, imagem.url, imagem.principal)
          }
        }
      } else {
        // Cria o produto
        const produtoCriado = await produtos.criar(novoProduto)
        
        // Adiciona as imagens
        for (const imagem of imagensTemp) {
          await produtos.adicionarImagem(produtoCriado.id, imagem.url, imagem.principal)
        }
      }

      await carregarProdutos()
      setModalAberto(false)
      resetForm()
    } catch (err) {
      console.error('Erro ao salvar produto:', err)
      setError('Erro ao salvar o produto')
    } finally {
      setLoading(false)
    }
  }

  const handleEditar = (produto: Produto) => {
    setProdutoEmEdicao(produto)
    setNovoProduto({
      nome: produto.nome,
      descricao: produto.descricao || '',
      preco: produto.preco,
      preco_promocional: produto.preco_promocional,
      estoque: produto.estoque,
      categoria: produto.categoria,
      marca: produto.marca || '',
      destaque: produto.destaque,
      status: produto.status
    })
    setImagensTemp(produto.imagens || [])
    setModalAberto(true)
  }

  const resetForm = () => {
    setProdutoEmEdicao(null)
    setNovoProduto({
      nome: '',
      descricao: '',
      preco: 0,
      preco_promocional: null,
      estoque: 0,
      categoria: 'cabelo',
      marca: '',
      destaque: false,
      status: true
    })
    setImagensTemp([])
  }

  const formatarPreco = (preco: number) => {
    return preco.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const handleExcluirClick = (produto: Produto) => {
    setProdutoParaExcluir(produto)
  }

  const handleConfirmarExclusao = async () => {
    if (produtoParaExcluir) {
      setLoading(true)
      try {
        await produtos.excluir(produtoParaExcluir.id)
        await carregarProdutos()
        setProdutoParaExcluir(null)
      } catch (err) {
        console.error('Erro ao excluir produto:', err)
        setError('Erro ao excluir o produto')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleExcluirImagem = async (imagem: ProdutoImagem) => {
    if (imagem.id.startsWith('temp-')) {
      // Remove apenas do estado temporário
      setImagensTemp(prev => prev.filter(img => img.id !== imagem.id))
    } else if (produtoEmEdicao) {
      try {
        await produtos.excluirImagem(imagem.id)
        setImagensTemp(prev => prev.filter(img => img.id !== imagem.id))
      } catch (err) {
        console.error('Erro ao excluir imagem:', err)
        setError('Erro ao excluir a imagem')
      }
    }
  }

  const handleDefinirPrincipal = async (imagem: ProdutoImagem) => {
    setImagensTemp(prev => prev.map(img => ({
      ...img,
      principal: img.id === imagem.id
    })))

    if (!imagem.id.startsWith('temp-') && produtoEmEdicao) {
      try {
        await produtos.definirImagemPrincipal(produtoEmEdicao.id, imagem.id)
      } catch (err) {
        console.error('Erro ao definir imagem principal:', err)
        setError('Erro ao definir a imagem principal')
      }
    }
  }

  if (loading && !produtosLista.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-red-500">Produtos</h2>
        <button 
          onClick={() => {
            resetForm()
            setModalAberto(true)
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-900 transition-all whitespace-nowrap"
        >
          <span>+</span>
          <span>Adicionar Produto</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-red-600/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-red-600/20">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Produto</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Categoria</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Preço</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Estoque</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-600/10">
              {produtosLista.map(produto => (
                <tr key={produto.id} className="hover:bg-red-600/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {produto.imagens?.find(img => img.principal)?.url ? (
                        <img 
                          src={produto.imagens.find(img => img.principal)?.url}
                          alt={produto.nome}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-red-600/20 flex items-center justify-center">
                          <span className="text-sm">Sem foto</span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-white font-medium">{produto.nome}</h3>
                        <p className="text-gray-400 text-sm">{produto.marca || 'Sem marca'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-sm bg-red-600/20 text-red-400">
                      {produto.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-white">{formatarPreco(produto.preco)}</div>
                      {produto.preco_promocional && (
                        <div className="text-red-500 text-sm">
                          {formatarPreco(produto.preco_promocional)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${
                      produto.estoque > 10 
                        ? 'text-green-400' 
                        : produto.estoque > 0 
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}>
                      {produto.estoque} unidades
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      produto.status 
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {produto.status ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => handleEditar(produto)}
                      className="text-blue-500 hover:text-blue-400 transition-colors"
                    >
                      <span className="sm:hidden">✏️</span>
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button 
                      onClick={() => handleExcluirClick(produto)}
                      className="text-red-500 hover:text-red-400 transition-colors"
                    >
                      <span className="sm:hidden">🗑️</span>
                      <span className="hidden sm:inline">Excluir</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Adicionar/Editar */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] p-6 rounded-lg w-full max-w-2xl relative border border-red-600/30">
            <h3 className="text-xl font-bold text-red-500 mb-6">
              {produtoEmEdicao ? 'Editar Produto' : 'Novo Produto'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-2">Nome</label>
                  <input
                    type="text"
                    value={novoProduto.nome}
                    onChange={e => setNovoProduto(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-2">Descrição</label>
                  <textarea
                    value={novoProduto.descricao}
                    onChange={e => setNovoProduto(prev => ({ ...prev, descricao: e.target.value }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Preço</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={novoProduto.preco}
                    onChange={e => setNovoProduto(prev => ({ ...prev, preco: parseFloat(e.target.value) }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Preço Promocional</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={novoProduto.preco_promocional || ''}
                    onChange={e => setNovoProduto(prev => ({ 
                      ...prev, 
                      preco_promocional: e.target.value ? parseFloat(e.target.value) : null 
                    }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Estoque</label>
                  <input
                    type="number"
                    min="0"
                    value={novoProduto.estoque}
                    onChange={e => setNovoProduto(prev => ({ ...prev, estoque: parseInt(e.target.value) }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Categoria</label>
                  <select
                    value={novoProduto.categoria}
                    onChange={e => setNovoProduto(prev => ({ 
                      ...prev, 
                      categoria: e.target.value as CategoriaProduto 
                    }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                    required
                  >
                    <option value="cabelo">Cabelo</option>
                    <option value="barba">Barba</option>
                    <option value="skincare">Skincare</option>
                    <option value="perfumaria">Perfumaria</option>
                    <option value="acessorios">Acessórios</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Marca</label>
                  <input
                    type="text"
                    value={novoProduto.marca}
                    onChange={e => setNovoProduto(prev => ({ ...prev, marca: e.target.value }))}
                    className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
                  />
                </div>

                {/* Seção de Imagens */}
                <div className="space-y-4">
                  <label className="block text-gray-400 text-sm mb-2">Imagens do Produto</label>
                  
                  {/* Lista de Imagens */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                    {imagensTemp.map((imagem, index) => (
                      <div key={imagem.id} className="relative group">
                        <img 
                          src={imagem.url} 
                          alt={`Imagem ${index + 1}`}
                          className={`w-full aspect-square object-cover rounded-lg ${
                            imagem.principal ? 'ring-2 ring-red-500' : ''
                          }`}
                        />
                        
                        {/* Overlay com ações */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDefinirPrincipal(imagem)}
                            className={`p-2 rounded-full ${
                              imagem.principal 
                                ? 'bg-red-500 text-white' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                            title={imagem.principal ? 'Imagem Principal' : 'Definir como Principal'}
                          >
                            ⭐
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExcluirImagem(imagem)}
                            className="p-2 rounded-full bg-gray-800 text-gray-400 hover:bg-red-600 hover:text-white"
                            title="Excluir Imagem"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Botão de Upload */}
                    <label className="relative aspect-square rounded-lg border-2 border-dashed border-red-600/20 hover:border-red-600/40 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer">
                      <span className="text-2xl">+</span>
                      <span className="text-sm text-gray-400">Adicionar Imagem</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadFoto}
                        className="hidden"
                        disabled={uploadingFoto}
                      />
                      {uploadingFoto && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={novoProduto.destaque}
                      onChange={e => setNovoProduto(prev => ({ ...prev, destaque: e.target.checked }))}
                      className="form-checkbox bg-[#2a2a2a] border-red-600/20 text-red-600 rounded"
                    />
                    <label className="text-gray-400">Destaque</label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={novoProduto.status}
                      onChange={e => setNovoProduto(prev => ({ ...prev, status: e.target.checked }))}
                      className="form-checkbox bg-[#2a2a2a] border-red-600/20 text-red-600 rounded"
                    />
                    <label className="text-gray-400">Ativo</label>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading || uploadingFoto}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-lg hover:from-red-700 hover:to-red-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalAberto(false)
                    resetForm()
                  }}
                  className="flex-1 border border-red-600/20 text-white py-3 rounded-lg hover:bg-red-600/10 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmationModal
        isOpen={!!produtoParaExcluir}
        onClose={() => setProdutoParaExcluir(null)}
        onConfirm={handleConfirmarExclusao}
        title="Confirmar Exclusão de Produto"
        message={`Tem certeza que deseja excluir o produto ${produtoParaExcluir?.nome}? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Não, Manter"
        type="danger"
        isLoading={loading}
      />
    </div>
  )
} 