import { supabase } from '../lib/supabase'
import { sounds } from './sounds'

export class NotificationService {
  private static instance: NotificationService
  private subscriptions: (() => void)[] = []
  private channel: any = null

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
    if (this.channel) {
      this.channel.unsubscribe()
    }

    // Inscrever para receber atualizações de novos agendamentos
    this.channel = supabase
      .channel('notificacoes-agendamentos')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta todos os eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'agendamentos'
        },
        async (payload) => {
          console.log('Notificação recebida:', payload)
          
          // Tocar som específico baseado no tipo de evento
          if (payload.eventType === 'INSERT') {
            sounds.play('agendamento-admin')
            this.show('Novo agendamento recebido!')
          } else if (payload.eventType === 'UPDATE') {
            sounds.play('status-change')
            this.show('Agendamento atualizado')
          } else if (payload.eventType === 'DELETE') {
            sounds.play('delete')
            this.show('Agendamento cancelado')
          }
          
          // Notificar todos os callbacks registrados
          this.subscriptions.forEach(callback => callback())
        }
      )
      .subscribe()

    return () => {
      if (this.channel) {
        this.channel.unsubscribe()
        this.channel = null
      }
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
    // Implementar notificação visual (toast)
    if (window.Notification && Notification.permission === 'granted') {
      new Notification('Studio Delas', {
        body: message,
        icon: '/logo.png'
      })
    }
  }

  success(message: string) {
    this.show(message)
    sounds.play('sucesso')
  }

  error(message: string) {
    this.show(message)
    sounds.play('erro')
  }

  // Solicitar permissão para notificações
  public async requestNotificationPermission() {
    if (window.Notification && Notification.permission !== 'granted') {
      try {
        const permission = await Notification.requestPermission()
        return permission === 'granted'
      } catch (error) {
        console.error('Erro ao solicitar permissão de notificação:', error)
        return false
      }
    }
    return Notification.permission === 'granted'
  }
}

export const notificationService = NotificationService.getInstance() 