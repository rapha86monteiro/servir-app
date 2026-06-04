# Servir App — Guia de Configuração

## 1. Firebase — Criar projeto

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **Adicionar projeto** → dê um nome (ex: `servir-app`)
3. Siga os passos e crie o projeto

## 2. Ativar Authentication

1. No painel do Firebase, vá em **Authentication → Primeiros passos**
2. Clique em **E-mail/senha** e ative

## 3. Ativar Firestore

1. Vá em **Firestore Database → Criar banco de dados**
2. Escolha **Modo de produção**
3. Selecione a região mais próxima (ex: `us-east1`)

## 4. Regras do Firestore

1. Em **Firestore → Regras**, cole o conteúdo do arquivo `firestore.rules`
2. Clique em **Publicar**

## 5. Obter as credenciais

1. Em **Configurações do projeto (⚙️) → Seus aplicativos → Web**
2. Registre o app com um apelido
3. Copie os valores de `firebaseConfig`

## 6. Configurar variáveis de ambiente

1. Copie `.env.local.example` para `.env.local`
2. Preencha com os valores do Firebase:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## 7. Criar o primeiro admin

No Firebase Console, vá em **Authentication → Usuários → Adicionar usuário** e crie um e-mail/senha.

Depois, em **Firestore → Dados → Coleção `users`**, crie um documento com o UID do usuário:

```json
{
  "uid": "UID_DO_USUARIO",
  "name": "Administrador",
  "email": "admin@suaigreja.com",
  "role": "admin",
  "teamIds": []
}
```

## 8. Abrir no StackBlitz

1. Faça upload do projeto para o GitHub
2. Acesse: `stackblitz.com/github/SEU-USUARIO/servir-app`
3. No terminal do StackBlitz: `npm install && npm run dev`

## 9. Deploy no Vercel (produção)

1. Acesse [vercel.com](https://vercel.com) → **Import Project** → selecione o repositório
2. Adicione as variáveis de ambiente do `.env.local`
3. Clique em **Deploy**

---

## Estrutura de equipes cadastradas

As equipes do departamento **Servir** são:
- Estacionamento
- Portão
- Hall de Entrada
- Recepção
- Templo
- Frente
- Diretor de Culto
- Banheiro
- Mezanino
- Oferta
- Apoio e Limpeza
- Gabinete
