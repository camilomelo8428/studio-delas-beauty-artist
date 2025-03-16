import { supabase } from '../lib/supabase'
import { sounds } from './sounds'

export class NotificationService {
  private static instance: NotificationService
  private subscriptions: (() => void)[] = []

  private constructor() {
    // Singleton
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  public initializeRealtime() {
    // Inscrever para receber atualizações de novos agendamentos
    const subscription = supabase
      .channel('notificacoes-agendamentos')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agendamentos'
        },
        async (payload) => {
          // Tocar som de notificação imediatamente
          sounds.play('agendamento-admin')
          
          // Notificar todos os callbacks registrados
          this.subscriptions.forEach(callback => callback())
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  public onNewAppointment(callback: () => void) {
    this.subscriptions.push(callback)
    
    // Retorna função para remover o callback
    return () => {
      this.subscriptions = this.subscriptions.filter(cb => cb !== callback)
    }
  }

  show(message: string) {
    // Implementação existente
  }

  success(message: string) {
    this.show(message)
  }

  error(message: string) {
    this.show(message)
  }
}

export const notificationService = NotificationService.getInstance() 