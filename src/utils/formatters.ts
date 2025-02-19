export const formatarTelefone = (telefone: string) => {
  // Remove tudo que não é número
  const numeros = telefone.replace(/\D/g, '')
  
  // Verifica se tem a quantidade correta de números
  if (numeros.length < 10 || numeros.length > 11) {
    return telefone
  }
  
  // Formata para celular (11 dígitos) ou fixo (10 dígitos)
  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
  } else {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`
  }
}

export const validarTelefone = (telefone: string) => {
  // Remove tudo que não é número
  const numeros = telefone.replace(/\D/g, '')
  
  // Verifica se tem a quantidade correta de números
  return numeros.length === 10 || numeros.length === 11
}

export const limparTelefone = (telefone: string) => {
  // Remove tudo que não é número
  return telefone.replace(/\D/g, '')
} 