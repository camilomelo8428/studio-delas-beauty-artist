import { supabase } from '../lib/supabase'

export const storageService = {
  upload: async (bucket: string, path: string, file: File) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      throw error
    }
  },

  getPublicUrl: async (bucket: string, path: string) => {
    try {
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

      return data.publicUrl
    } catch (error) {
      console.error('Erro ao obter URL pública:', error)
      throw error
    }
  },

  delete: async (bucket: string, path: string) => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      if (error) throw error
    } catch (error) {
      console.error('Erro ao excluir arquivo:', error)
      throw error
    }
  }
} 