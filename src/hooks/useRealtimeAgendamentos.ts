import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtimeAgendamentos(onUpdate: () => void) {
  useEffect(() => {
    let channel: RealtimeChannel

    const setupRealtimeSubscription = async () => {
      // Inscreve-se na tabela de agendamentos
      channel = supabase
        .channel('agendamentos_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Escuta todos os eventos (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'agendamentos',
          },
          () => {
            console.log('Mudança detectada em agendamentos')
            onUpdate()
          }
        )
        .subscribe()
    }

    setupRealtimeSubscription()

    // Cleanup na desmontagem do componente
    return () => {
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [onUpdate])
} 