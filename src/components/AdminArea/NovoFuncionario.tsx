import { useState } from 'react'
import type { NovoFuncionario, CargoFuncionario } from '../../services/admin'
import { useStorage } from '../../hooks/useAdmin'

interface NovoFuncionarioProps {
  onSubmit: (funcionario: NovoFuncionario & { senha: string }) => Promise<void>
  onCancel: () => void
}

const CARGOS = [
  { value: 'barbeiro', label: 'Barbeiro' },
  { value: 'cabeleireiro', label: 'Cabeleireiro' },
  { value: 'manicure', label: 'Manicure' },
  { value: 'esteticista', label: 'Esteticista' },
  { value: 'maquiador', label: 'Maquiador(a)' },
  { value: 'designer_sobrancelhas', label: 'Designer de Sobrancelhas' },
  { value: 'massagista', label: 'Massagista' },
  { value: 'depilador', label: 'Depilador(a)' },
  { value: 'admin', label: 'Administrador' }
] as const

const ESPECIALIDADES: Record<CargoFuncionario, string[]> = {
  barbeiro: [
    'Corte Masculino',
    'Barba',
    'Pigmentação',
    'Relaxamento'
  ],
  cabeleireiro: [
    'Corte Feminino',
    'Coloração',
    'Mechas',
    'Alisamento',
    'Hidratação',
    'Penteados'
  ],
  esteticista: [
    'Limpeza de Pele',
    'Peeling',
    'Microagulhamento',
    'Radiofrequência',
    'Tratamentos Anti-idade',
    'Drenagem Facial',
    'Drenagem Linfática',
    'Massagem Modeladora',
    'Tratamento para Celulite',
    'Tratamento para Flacidez',
    'Criolipólise',
    'Ultrassom'
  ],
  maquiador: [
    'Maquiagem Social',
    'Maquiagem para Noivas',
    'Maquiagem Artística',
    'Auto-maquiagem'
  ],
  designer_sobrancelhas: [
    'Design com Linha',
    'Design com Cera',
    'Henna',
    'Micropigmentação'
  ],
  massagista: [
    'Massagem Relaxante',
    'Massagem Terapêutica',
    'Shiatsu',
    'Pedras Quentes'
  ],
  depilador: [
    'Depilação com Cera',
    'Depilação a Laser',
    'Depilação Egípcia',
    'Depilação com Linha'
  ],
  manicure: [
    'Manicure',
    'Pedicure',
    'Unhas em Gel',
    'Unhas em Fibra'
  ],
  admin: []
}

export default function NovoFuncionario({ onSubmit, onCancel }: NovoFuncionarioProps) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cargo, setCargo] = useState<CargoFuncionario>('barbeiro')
  const [especialidades, setEspecialidades] = useState<string[]>([])
  const [foto, setFoto] = useState<File | null>(null)
  const [erro, setErro] = useState('')
  const { uploadImagem } = useStorage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    try {
      let foto_url = ''
      if (foto) {
        foto_url = await uploadImagem('funcionarios', foto)
      }

      await onSubmit({
        nome,
        email,
        senha,
        telefone,
        cargo,
        especialidades,
        foto_url,
        status: true
      })
    } catch (error) {
      console.error('Erro ao cadastrar funcionário:', error)
      setErro('Erro ao cadastrar funcionário. Tente novamente.')
    }
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFoto(e.target.files[0])
    }
  }

  const handleCargoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novoCargo = e.target.value as CargoFuncionario
    setCargo(novoCargo)
    setEspecialidades([]) // Limpa as especialidades ao mudar o cargo
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] p-6 rounded-xl border border-pink-600/20">
      <h2 className="text-2xl font-bold text-pink-500 mb-6">Novo Funcionário</h2>

      {erro && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-pink-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-600/40"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-pink-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-600/40"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-pink-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-600/40"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Telefone</label>
          <input
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-pink-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-600/40"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Cargo</label>
          <select
            value={cargo}
            onChange={handleCargoChange}
            className="w-full bg-[#1a1a1a] border border-pink-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-600/40"
            required
          >
            {CARGOS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {cargo !== 'admin' && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">Especialidades</label>
            <div className="space-y-2">
              {ESPECIALIDADES[cargo].map((esp) => (
                <label key={esp} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={especialidades.includes(esp)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEspecialidades([...especialidades, esp])
                      } else {
                        setEspecialidades(especialidades.filter(e => e !== esp))
                      }
                    }}
                    className="form-checkbox bg-[#1a1a1a] border border-pink-600/20 text-pink-600 rounded focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-white">{esp}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-400 mb-1">Foto</label>
          <input
            type="file"
            onChange={handleFotoChange}
            accept="image/*"
            className="w-full bg-[#1a1a1a] border border-pink-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-600/40"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-pink-600/20 text-white rounded-lg hover:bg-pink-600/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-lg hover:from-pink-700 hover:to-pink-800 transition-colors"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  )
} 