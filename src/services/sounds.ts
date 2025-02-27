// Tipos de sons disponíveis no sistema
export type SoundType = 
  | 'agendamento-cliente'   // Som quando cliente faz agendamento
  | 'agendamento-admin'     // Som quando admin recebe agendamento
  | 'notificacao'          // Som geral de notificação
  | 'erro'                 // Som de erro
  | 'sucesso'             // Som de sucesso
  | 'click'               // Som suave de click
  | 'hover'              // Som suave de hover
  | 'modal-open'         // Som ao abrir modal
  | 'modal-close'        // Som ao fechar modal
  | 'status-change'      // Som ao mudar status
  | 'delete'             // Som ao deletar
  | 'filter-change'      // Som ao mudar filtros
  | 'tab-change'         // Som ao mudar tabs

// Mapeamento dos tipos de som para os arquivos
const soundFiles: Record<SoundType, string> = {
  'agendamento-cliente': '/sounds/appointment-success.mp3',
  'agendamento-admin': '/sounds/new-appointment.mp3',
  'notificacao': '/sounds/notification.mp3',
  'erro': '/sounds/error.mp3',
  'sucesso': '/sounds/success.mp3',
  'click': '/sounds/click.mp3',
  'hover': '/sounds/hover.mp3',
  'modal-open': '/sounds/modal-open.mp3',
  'modal-close': '/sounds/modal-close.mp3',
  'status-change': '/sounds/status-change.mp3',
  'delete': '/sounds/delete.mp3',
  'filter-change': '/sounds/filter-change.mp3',
  'tab-change': '/sounds/tab-change.wav'  // Atualizado para .wav
}

// Cache de áudio para melhor performance
const audioCache: Record<string, HTMLAudioElement> = {}

// Volume padrão para cada tipo de som
const volumeLevels: Record<SoundType, number> = {
  'agendamento-cliente': 0.7,
  'agendamento-admin': 0.7,
  'notificacao': 0.6,
  'erro': 0.6,
  'sucesso': 0.7,
  'click': 0.2,
  'hover': 0.1,
  'modal-open': 0.3,
  'modal-close': 0.3,
  'status-change': 0.4,
  'delete': 0.5,
  'filter-change': 0.2,
  'tab-change': 0.2
}

// Flag para debug
const DEBUG_SOUNDS = true

export const sounds = {
  // Verificar se um arquivo de som existe
  checkSoundFile: async (type: SoundType): Promise<boolean> => {
    try {
      const response = await fetch(soundFiles[type])
      return response.ok
    } catch (error) {
      console.error(`[Sons] Erro ao verificar arquivo de som ${type}:`, error)
      return false
    }
  },

  // Tocar um som específico
  play: async (type: SoundType) => {
    try {
      console.log(`[Sons] Tentando tocar: ${type} (${soundFiles[type]})`)
      
      // Se já existe no cache, tenta tocar
      if (audioCache[type]) {
        try {
          console.log(`[Sons] Usando cache para: ${type}`)
          audioCache[type].currentTime = 0
          await audioCache[type].play()
          return
        } catch (error) {
          console.error(`[Sons] Erro ao tocar som do cache ${type}:`, error)
          delete audioCache[type] // Remove do cache se falhou
        }
      }

      // Verifica se o arquivo existe
      const exists = await sounds.checkSoundFile(type)
      if (!exists) {
        throw new Error(`[Sons] Arquivo não encontrado: ${soundFiles[type]}`)
      }

      console.log(`[Sons] Criando novo áudio para: ${type}`)
      const audio = new Audio()
      
      // Configura handlers antes de definir o src
      audio.preload = 'auto'
      audio.volume = volumeLevels[type]

      // Adiciona listeners para debug
      audio.oncanplaythrough = () => console.log(`[Sons] Pronto para tocar: ${type}`)
      audio.onplay = () => console.log(`[Sons] Iniciando: ${type}`)
      audio.onended = () => console.log(`[Sons] Finalizado: ${type}`)
      audio.onerror = (e) => console.error(`[Sons] Erro ao tocar ${type}:`, e)

      // Carrega e toca o som
      audio.src = soundFiles[type]
      
      try {
        // Aguarda o carregamento antes de tocar
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error(`[Sons] Timeout ao carregar: ${type}`))
          }, 5000) // 5 segundos de timeout

          audio.oncanplaythrough = () => {
            clearTimeout(timeoutId)
            resolve(true)
          }
          audio.onerror = (e) => {
            clearTimeout(timeoutId)
            reject(e)
          }
          audio.load()
        })

        console.log(`[Sons] Iniciando playback: ${type}`)
        await audio.play()
        console.log(`[Sons] Playback iniciado com sucesso: ${type}`)

        // Adiciona ao cache se tocou com sucesso
        audioCache[type] = audio

      } catch (error) {
        console.error(`[Sons] Erro durante carregamento/playback de ${type}:`, error)
        throw error
      }

    } catch (error) {
      console.error(`[Sons] Erro ao tocar som ${type}:`, error)
      // Não tenta tocar som de erro para evitar loop infinito
    }
  },

  // Pré-carregar todos os sons
  preloadAll: async () => {
    console.log('[Sons] Iniciando pré-carregamento...')
    
    for (const [type, file] of Object.entries(soundFiles)) {
      try {
        // Verifica se o arquivo existe
        const exists = await sounds.checkSoundFile(type as SoundType)
        if (!exists) {
          console.error(`[Sons] Arquivo não encontrado: ${file}`)
          continue
        }

        if (!audioCache[type]) {
          const audio = new Audio()
          audio.preload = 'auto'
          audio.volume = volumeLevels[type as SoundType]
          
          // Aguarda o carregamento
          await new Promise((resolve, reject) => {
            audio.oncanplaythrough = resolve
            audio.onerror = reject
            audio.src = file
            audio.load()
          })

          audioCache[type] = audio
          console.log(`[Sons] Pré-carregado: ${type}`)
        }
      } catch (error) {
        console.error(`[Sons] Erro ao pré-carregar ${type}:`, error)
      }
    }
    
    console.log('[Sons] Pré-carregamento concluído')
  }
} 