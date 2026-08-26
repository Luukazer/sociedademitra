# Ficha RPG — Vercel + Supabase

Projeto inicial funcional para a ficha digital baseada no layout enviado.

## O que já está implementado

- Painel do mestre com login.
- Criação e exclusão de fichas.
- Link individual e aleatório para cada jogador.
- Ficha pública por link.
- Salvamento automático com debounce.
- Upload de imagem do personagem (máx. 5 MB).
- Esperança, Redução e Evasão como campos numéricos.
- Condições clicáveis.
- Pilares e competências clicáveis.
- Layout responsivo para computador e celular.
- Banco persistente no Supabase.
- Preparado para deploy na Vercel.

## 1. Supabase

1. Crie um projeto no Supabase.
2. Vá em SQL Editor.
3. Cole e execute `supabase/schema.sql`.
4. Em Authentication > Users, crie o usuário que será o mestre.
5. Copie a URL do projeto e a Publishable Key.
6. Copie também a Service Role Key — ela deve ficar somente como variável secreta no servidor.

## 2. Variáveis

Copie `.env.example` para `.env.local`:

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000/mestre`.

## 4. Vercel

Suba este projeto para GitHub e importe no Vercel.

Nas Environment Variables da Vercel, cadastre:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Depois faça o deploy.

## Observação importante sobre segurança

O link do jogador funciona como uma chave secreta de acesso à ficha. Não compartilhe o link publicamente.

A Service Role Key nunca deve ser colocada no navegador, em código público ou no repositório. Ela é usada apenas pelas rotas do servidor para validar os links e armazenar imagens.
