import { useState } from 'react'
import type { Funcionario } from '../../services/admin'
import { FaEdit, FaTrash } from 'react-icons/fa'

interface ListaFuncionariosProps {
  funcionarios: Funcionario[]
  onEdit: (funcionario: Funcionario) => void
  onDelete: (id: string) => Promise<void>
}

const CARGO_LABELS: { [key: string]: string } = {
  barbeiro: 'Barbeiro',
  cabeleireiro: 'Cabeleireiro',
  manicure: 'Manicure',
  esteticista: 'Esteticista',
  maquiador: 'Maquiador(a)',
  designer_sobrancelhas: 'Designer de Sobrancelhas',
  massagista: 'Massagista',
  depilador: 'Depilador(a)',
  admin: 'Administrador'
}

export default function ListaFuncionarios({ funcionarios, onEdit, onDelete }: ListaFuncionariosProps) {
  const [funcionarioParaDeletar, setFuncionarioParaDeletar] = useState<Funcionario | null>(null)

  const handleDelete = async (funcionario: Funcionario) => {
    setFuncionarioParaDeletar(funcionario)
  }

  const confirmarDelete = async () => {
    if (funcionarioParaDeletar) {
      await onDelete(funcionarioParaDeletar.id)
      setFuncionarioParaDeletar(null)
    }
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] p-6 rounded-xl border border-pink-600/20">
      <h2 className="text-2xl font-bold text-pink-500 mb-6">Funcionários</h2>

      <div className="grid grid-cols-1 gap-4">
        {funcionarios.map((funcionario) => (
          <div
            key={funcionario.id}
            className="bg-[#1a1a1a] border border-pink-600/20 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              {funcionario.foto_url && (
                <img
                  src={funcionario.foto_url}
                  alt={funcionario.nome}
                  className="w-12 h-12 rounded-full object-cover border border-pink-600/20"
                />
              )}
              <div>
                <h3 className="text-lg font-semibold text-white">{funcionario.nome}</h3>
                <p className="text-sm text-gray-400">{funcionario.email}</p>
                <p className="text-sm text-gray-400">{funcionario.telefone}</p>
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 text-xs rounded-full bg-pink-600/10 text-pink-500">
                    {CARGO_LABELS[funcionario.cargo]}
                  </span>
                </div>
                {funcionario.especialidades && funcionario.especialidades.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {funcionario.especialidades.map((esp) => (
                      <span
                        key={esp}
                        className="inline-block px-2 py-1 text-xs rounded-full bg-[#2a2a2a] text-gray-300"
                      >
                        {esp}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(funcionario)}
                className="p-2 text-pink-500 hover:text-pink-400 transition-colors"
                title="Editar"
              >
                <FaEdit size={20} />
              </button>
              <button
                onClick={() => handleDelete(funcionario)}
                className="p-2 text-red-500 hover:text-red-400 transition-colors"
                title="Excluir"
              >
                <FaTrash size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de confirmação de exclusão */}
      {funcionarioParaDeletar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-pink-600/20 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-300 mb-6">
              Tem certeza que deseja excluir o funcionário {funcionarioParaDeletar.nome}?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setFuncionarioParaDeletar(null)}
                className="px-4 py-2 border border-pink-600/20 text-white rounded-lg hover:bg-pink-600/10"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 