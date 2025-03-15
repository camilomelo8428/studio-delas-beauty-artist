import { useState } from 'react'
import type { NovoFuncionario, CargoFuncionario } from '../../services/admin'
import { useStorage } from '../../hooks/useAdmin'

interface NovoFuncionarioProps {
  onSubmit: (funcionario: NovoFuncionario) => Promise<void>
  onCancel: () => void
}

const CARGOS: { value: CargoFuncionario; label: string }[] = [
  { value: 'barbeiro', label: 'Barbeiro' },
  { value: 'cabeleireiro', label: 'Cabeleireiro' },
  { value: 'manicure', label: 'Manicure' },
  { value: 'esteticista_facial', label: 'Esteticista Facial' },
  { value: 'esteticista_corporal', label: 'Esteticista Corporal' },
  { value: 'maquiador', label: 'Maquiador(a)' },
  { value: 'designer_sobrancelhas', label: 'Designer de Sobrancelhas' },
  { value: 'massagista', label: 'Massagista' },
  { value: 'depilador', label: 'Depilador(a)' },
  { value: 'admin', label: 'Administrador' }
]

const ESPECIALIDADES: { [key in CargoFuncionario]?: string[] } = {
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
  esteticista_facial: [
    'Limpeza de Pele',
    'Peeling',
    'Microagulhamento',
    'Radiofrequência',
    'Tratamentos Anti-idade',
    'Drenagem Facial'
  ],
  esteticista_corporal: [
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
  ]
}

export default function NovoFuncionario({ onSubmit, onCancel }: NovoFuncionarioProps) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cargo, setCargo] = useState<CargoFuncionario>('barbeiro')
  const [comissao, setComissao] = useState(30)
  const [especialidadesSelecionadas, setEspecialidadesSelecionadas] = useState<string[]>([])
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
        comissao,
        especialidades: especialidadesSelecionadas,
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
    setEspecialidadesSelecionadas([]) // Limpa as especialidades ao mudar o cargo
  }

  const toggleEspecialidade = (especialidade: string) => {
    setEspecialidadesSelecionadas(prev => 
      prev.includes(especialidade)
        ? prev.filter(e => e !== especialidade)
        : [...prev, especialidade]
    )
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] p-6 rounded-xl border border-gold-600/20">
      <h2 className="text-2xl font-bold text-gold-500 mb-6">Novo Funcionário</h2>

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
            className="w-full bg-[#1a1a1a] border border-gold-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-600/40"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gold-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-600/40"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gold-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-600/40"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Telefone</label>
          <input
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gold-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-600/40"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Cargo</label>
          <select
            value={cargo}
            onChange={handleCargoChange}
            className="w-full bg-[#1a1a1a] border border-gold-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-600/40"
            required
          >
            {CARGOS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Comissão (%)</label>
          <input
            type="number"
            value={comissao}
            onChange={(e) => setComissao(Number(e.target.value))}
            min="0"
            max="100"
            className="w-full bg-[#1a1a1a] border border-gold-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-600/40"
            required
          />
        </div>

        {ESPECIALIDADES[cargo] && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">Especialidades</label>
            <div className="grid grid-cols-2 gap-2">
              {ESPECIALIDADES[cargo]?.map((especialidade) => (
                <label
                  key={especialidade}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={especialidadesSelecionadas.includes(especialidade)}
                    onChange={() => toggleEspecialidade(especialidade)}
                    className="rounded border-gold-600/20 text-gold-600 focus:ring-gold-500"
                  />
                  <span className="text-sm text-gray-300">{especialidade}</span>
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
            className="w-full bg-[#1a1a1a] border border-gold-600/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-600/40"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gold-600/20 text-white rounded-lg hover:bg-gold-600/10"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-gold-600 to-gold-700 text-white rounded-lg hover:from-gold-700 hover:to-gold-800"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  )
} 