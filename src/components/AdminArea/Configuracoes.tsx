import { useState, useEffect } from 'react'
import { configuracoes, type Configuracoes } from '../../services/configuracoes'

export default function Configuracoes() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  
  const [config, setConfig] = useState<Configuracoes>({
    id: '1',
    nome_empresa: 'Barbearia Skull',
    logo_url: null,
    telefone: '(91) 3333-4444',
    email: 'contato@barbeariaskull.com',
    endereco: 'Av. Principal, 1234',
    bairro: 'Centro',
    cidade: 'Belém',
    estado: 'PA',
    cep: '66000-000',
    horario_funcionamento: 'Seg à Sex: 09h - 20h | Sáb: 09h - 18h | Dom: Fechado',
    instagram: '@barbeariaskull',
    facebook: '/barbeariaskull',
    whatsapp: '(91) 98888-7777',
    updated_at: new Date().toISOString()
  })

  const estados = [
    { value: 'AC', label: 'Acre' },
    { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' },
    { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' },
    { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' },
    { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' },
    { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' }
  ]

  useEffect(() => {
    const carregarConfiguracoes = async () => {
      setLoading(true)
      try {
        const data = await configuracoes.obter()
        setConfig(data)
      } catch (err) {
        console.error('Erro ao carregar configurações:', err)
        setError('Erro ao carregar as configurações')
      } finally {
        setLoading(false)
      }
    }

    carregarConfiguracoes()
  }, [])

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    
    setUploadingLogo(true)
    try {
      const file = e.target.files[0]
      const logoUrl = await configuracoes.uploadLogo(file)
      setConfig(prev => ({ ...prev, logo_url: logoUrl }))
    } catch (err) {
      console.error('Erro ao fazer upload:', err)
      setError('Erro ao fazer upload da logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      await configuracoes.atualizar(config)
      setSuccess(true)
    } catch (err) {
      console.error('Erro ao atualizar configurações:', err)
      setError('Erro ao salvar as configurações')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !config.nome_empresa) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-red-500">Configurações</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <p className="text-green-500 text-sm">Configurações atualizadas com sucesso!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {config.logo_url ? (
              <img
                src={config.logo_url}
                alt="Logo"
                className="w-32 h-32 rounded-full object-cover border-4 border-red-600/20"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-red-600/20 flex items-center justify-center border-4 border-red-600/20">
                <span className="text-3xl text-red-500">
                  {config.nome_empresa.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-red-600 text-white p-2 rounded-full cursor-pointer hover:bg-red-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadLogo}
                className="hidden"
                disabled={uploadingLogo}
              />
            </label>
          </div>
          {uploadingLogo && (
            <p className="text-sm text-gray-400">Fazendo upload...</p>
          )}
        </div>

        {/* Informações Básicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Nome da Empresa</label>
            <input
              type="text"
              value={config.nome_empresa}
              onChange={e => setConfig(prev => ({ ...prev, nome_empresa: e.target.value }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">E-mail</label>
            <input
              type="email"
              value={config.email}
              onChange={e => setConfig(prev => ({ ...prev, email: e.target.value }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Telefone</label>
            <input
              type="tel"
              value={config.telefone}
              onChange={e => setConfig(prev => ({ ...prev, telefone: e.target.value }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">WhatsApp</label>
            <input
              type="tel"
              value={config.whatsapp}
              onChange={e => setConfig(prev => ({ ...prev, whatsapp: e.target.value }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Endereço */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-gray-400 text-sm mb-2">Endereço</label>
            <input
              type="text"
              value={config.endereco}
              onChange={e => setConfig(prev => ({ ...prev, endereco: e.target.value }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Bairro</label>
            <input
              type="text"
              value={config.bairro}
              onChange={e => setConfig(prev => ({ ...prev, bairro: e.target.value }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">CEP</label>
            <input
              type="text"
              value={config.cep}
              onChange={e => setConfig(prev => ({ ...prev, cep: e.target.value }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Cidade</label>
            <input
              type="text"
              value={config.cidade}
              onChange={e => setConfig(prev => ({ ...prev, cidade: e.target.value }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Estado</label>
            <select
              value={config.estado}
              onChange={e => setConfig(prev => ({ ...prev, estado: e.target.value }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
              required
            >
              <option value="">Selecione</option>
              {estados.map(estado => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Horário de Funcionamento */}
        <div>
          <label className="block text-gray-400 text-sm mb-2">Horário de Funcionamento</label>
          <input
            type="text"
            value={config.horario_funcionamento}
            onChange={e => setConfig(prev => ({ ...prev, horario_funcionamento: e.target.value }))}
            className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
            required
          />
        </div>

        {/* Redes Sociais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Instagram</label>
            <input
              type="text"
              value={config.instagram}
              onChange={e => setConfig(prev => ({ ...prev, instagram: e.target.value }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Facebook</label>
            <input
              type="text"
              value={config.facebook}
              onChange={e => setConfig(prev => ({ ...prev, facebook: e.target.value }))}
              className="w-full bg-[#2a2a2a] border border-red-600/20 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || uploadingLogo}
          className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-lg hover:from-red-700 hover:to-red-900 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </form>
    </div>
  )
} 