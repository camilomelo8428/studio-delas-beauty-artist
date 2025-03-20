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
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-red-500">Promoções</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-red-600/20 via-red-600/10 to-transparent"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {servicosPromocao.map((servico, index) => (
            <motion.div
              key={servico.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] rounded-xl border border-red-600/20 overflow-hidden hover:border-red-600/40 transition-all group relative"
            >
              {/* Badge de Desconto */}
              <div className="absolute top-3 left-3 z-10">
                <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {calcularDesconto(servico.preco, servico.preco_promocional)}% OFF
                </span>
              </div>

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
              </div>

              {/* Informações do Serviço */}
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{servico.nome}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2">{servico.descricao}</p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-500">
                    R$ {servico.preco_promocional.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-400 line-through">
                    R$ {servico.preco.toFixed(2)}
                  </span>
                </div>

                <div className="text-sm text-gray-400">
                  <p>Duração: {servico.duracao_minutos} minutos</p>
                  <p className="text-xs mt-1">
                    Promoção válida até {new Date(servico.promocao_fim).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {servico.promocao_descricao && (
                  <p className="text-sm text-red-400 italic">
                    {servico.promocao_descricao}
                  </p>
                )}

                <button 
                  className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-2 rounded-lg hover:from-red-700 hover:to-red-900 transition-all"
                  onClick={() => {
                    // Aqui você pode adicionar a lógica para agendar o serviço
                    // Por exemplo, abrir o modal de agendamento ou redirecionar para a página de agendamento
                  }}
                >
                  Agendar
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
} 