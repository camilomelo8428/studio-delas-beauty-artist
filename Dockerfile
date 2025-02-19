# Use a imagem oficial do Node.js como base
FROM node:20-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de configuração do projeto
COPY package.json yarn.lock ./

# Instala as dependências do projeto
RUN yarn install --frozen-lockfile

# Copia o restante dos arquivos do projeto
COPY . .

# Compila o projeto
RUN yarn build

# Expõe a porta que a aplicação irá utilizar
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["yarn", "start"] 