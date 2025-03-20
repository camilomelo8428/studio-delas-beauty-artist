import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'

interface ServicoPromocao {
  id: string
  nome: string
  descricao: string
  preco: number
  preco_promocional: number
  duracao_minutos: number
  foto_url: string | null
  categoria: 'barbearia' | 'salao'
  promocao_ativa: boolean
  promocao_inicio: string
  promocao_fim: string
  promocao_descricao: string
}

export default function ServicosPromocao() {
  const [servicosPromocao, setServicosPromocao] = useState<ServicoPromocao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    carregarServicosPromocao()
  }, [])

  const carregarServicosPromocao = async () => {
    try {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('status', true)
        .eq('promocao_ativa', true)
        .gte('promocao_fim', new Date().toISOString())
        .order('nome')

      if (error) throw error
      setServicosPromocao(data || [])
    } catch (err: any) {
      console.error('Erro ao carregar serviços em promoção:', err)
      setError('Erro ao carregar serviços em promoção')
    } finally {
      setLoading(false)
    }
  }

  const calcularDesconto = (preco: number, precoPromocional: number) => {
    return Math.round(((preco - precoPromocional) / preco) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  if (servicosPromocao.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="relative flex items-center gap-4 bg-gradient-to-r from-red-600/20 via-red-600/10 to-transparent p-4 rounded-lg">
        <div className="absolute -top-2 -right-2">
          <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-red-600 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-bounce">🔥</span>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            Promoções Imperdíveis
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {servicosPromocao.map((servico, index) => (
            <motion.div
              key={servico.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-lg border border-red-600/20 overflow-hidden hover:border-red-600/40 hover:shadow-lg hover:shadow-red-600/10 transition-all duration-300"
            >
              {/* Badge de Desconto */}
              <div className="absolute top-2 left-2 z-10">
                <div className="relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                  <span className="relative inline-flex bg-red-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    {calcularDesconto(servico.preco, servico.preco_promocional)}% OFF
                  </span>
                </div>
              </div>

              {/* Imagem do Serviço */}
              <div className="aspect-[4/3] relative overflow-hidden">
                {servico.foto_url ? (
                  <img 
                    src={servico.foto_url} 
                    alt={servico.nome}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600/10 to-red-900/10">
                    <span className="text-3xl font-bold text-red-600/40">
                      {servico.nome.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/20"></div>
              </div>

              {/* Informações do Serviço */}
              <div className="p-4">
                <h3 className="text-base font-semibold text-white mb-1 line-clamp-1">{servico.nome}</h3>
                <p className="text-xs text-gray-400 line-clamp-2 mb-3">{servico.descricao}</p>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                    R$ {servico.preco_promocional.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-400 line-through">
                    R$ {servico.preco.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="text-red-500">⏱️</span>
                    {servico.duracao_minutos} min
                  </span>
                  <span className="text-red-500/50">•</span>
                  <span className="flex items-center gap-1">
                    <span className="text-red-500">📅</span>
                    Até {new Date(servico.promocao_fim).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
} 