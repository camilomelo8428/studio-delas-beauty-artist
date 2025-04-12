import { useEffect } from 'react'

interface SuccessScreenProps {
  onClose: () => void
  onLogin: () => void
}

export default function SuccessScreen({ onClose, onLogin }: SuccessScreenProps) {
  useEffect(() => {
    // Fecha automaticamente após 5 segundos
    const timer = setTimeout(() => {
      onLogin()
    }, 5000)

    return () => clearTimeout(timer)
  }, [onLogin])

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] p-8 rounded-2xl w-full max-w-md relative border border-pink-600/30 shadow-2xl">
        {/* Círculo de Sucesso Animado */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-pink-600/30 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-pink-600 rounded-full animate-[spin_2s_ease-in-out]"></div>
          <div className="absolute inset-0 flex items-center justify-center text-3xl text-pink-500">
            ✓
          </div>
        </div>

        {/* Mensagem de Sucesso */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Cadastro Realizado!</h2>
          <p className="text-gray-400">
            Sua conta foi criada com sucesso. Você já pode fazer login e começar a usar nossos serviços.
          </p>
        </div>

        {/* Barra de Progresso */}
        <div className="mt-8 bg-[#1a1a1a] rounded-full h-1 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-pink-600 to-pink-800 transition-all duration-[5000ms] ease-linear"
            style={{ width: '100%' }}
          ></div>
        </div>

        {/* Botões */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <button
            onClick={onLogin}
            className="flex-1 bg-gradient-to-r from-pink-600 to-pink-800 text-white py-3 rounded-lg hover:from-pink-700 hover:to-pink-900 transition-all font-medium"
          >
            Fazer Login
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-pink-600/20 text-white py-3 rounded-lg hover:bg-pink-600/10 transition-all font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
} 