# Guia de Deploy - Clearstok no Vercel

## 🔄 Deploy Automático via GitHub

O projeto está configurado para **deploy automático** no Vercel:

1. **Push para `main`** → Vercel detecta automaticamente
2. **Build automático** → `npm run build`
3. **Deploy automático** → Aplicação atualizada em produção

## 📦 Configuração Vercel

### Projeto no Vercel
- **Framework Preset:** Next.js
- **Root Directory:** `./` (raiz do projeto)
- **Build Command:** `npm run build` (padrão Next.js)
- **Output Directory:** `.next` (automático)
- **Install Command:** `npm install`

### Variáveis de Ambiente

Configurar no Vercel Dashboard → Settings → Environment Variables:

```
DATABASE_URL=postgresql://user:password@host:6543/db?pgbouncer=true
DIRECT_URL=postgresql://user:password@host:5432/db
```

**IMPORTANTE:**
- `DATABASE_URL` → Usa **Session Pooler** (porta 6543, `?pgbouncer=true`)
- `DIRECT_URL` → Usa **Direct Connection** (porta 5432) para migrations
- Ambos devem apontar para a **mesma base de dados Supabase**

### Verificar Deploy

1. Aceder ao [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecionar o projeto "Clearstok" (ou nome do projeto)
3. Verificar:
   - ✅ **Deployments** tab → Último deploy deve estar "Ready"
   - ✅ **Settings** → **Git** → Confirmar que está ligado ao repositório correto
   - ✅ **Settings** → **Environment Variables** → Verificar que `DATABASE_URL` e `DIRECT_URL` estão definidas

## 🔗 GitHub Integration

### Configuração
- **Repository:** `mateusbonifacio-wq/speakwise4`
- **Branch:** `main`
- **Auto-deploy:** Habilitado

### Workflow
```
1. Desenvolvimento local → git commit → git push
2. GitHub recebe push → webhook para Vercel
3. Vercel inicia build → npm run build
4. Vercel faz deploy → Aplicação atualizada
```

### Verificar Integração
- Vercel Dashboard → Settings → Git
- Confirmar que o repositório está conectado
- Verificar se "Auto-deploy" está ativo

## 🚀 Deploy Manual (se necessário)

### Via Vercel Dashboard
1. Ir para o projeto no Vercel
2. Clicar em **Deployments**
3. Clicar nos três pontos (...) do último deploy
4. Selecionar **Redeploy**

### Via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

## 📊 Monitorização

### Vercel Analytics
- Integrado em `app/layout.tsx`
- Tracking automático de page views

### Vercel Speed Insights
- Integrado em `app/layout.tsx`
- Monitoriza performance em tempo real

### Logs
- Aceder a Vercel Dashboard → Deployments → Selecionar deploy → **Logs**
- Ver erros de build ou runtime

## 🐛 Troubleshooting Deploy

### Build Fails
1. Verificar logs no Vercel
2. Testar localmente: `npm run build`
3. Verificar variáveis de ambiente estão corretas
4. Verificar se todas as dependências estão em `package.json`

### Runtime Errors
1. Verificar logs do Vercel (Runtime Logs)
2. Verificar `DATABASE_URL` está acessível
3. Verificar migrations foram aplicadas: `npx prisma migrate deploy`
4. Verificar que Prisma Client foi gerado: `npx prisma generate`

### Erro de Conexão à Base de Dados
1. Verificar `DATABASE_URL` está correto
2. Verificar que Supabase permite conexões do Vercel IP
3. Verificar que está a usar **Session Pooler** (porta 6543) e não Direct (porta 5432)

### Migrations Pendentes
Se houver migrations não aplicadas:
1. No Vercel, adicionar Build Command:
   ```
   npx prisma generate && npx prisma migrate deploy && npm run build
   ```
2. Ou rodar manualmente via Vercel CLI:
   ```bash
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

## 🔐 Segurança

- Variáveis de ambiente nunca devem ser commitadas no Git
- Usar sempre variáveis de ambiente do Vercel para dados sensíveis
- `DATABASE_URL` e `DIRECT_URL` apenas no Vercel, nunca no código

## 📝 Checklist de Deploy

Antes de fazer push para produção:
- [ ] `npm run build` funciona localmente
- [ ] Não há erros de TypeScript
- [ ] Variáveis de ambiente estão definidas no Vercel
- [ ] Migrations foram testadas localmente
- [ ] Código foi testado localmente

Após deploy:
- [ ] Verificar que o deploy foi bem-sucedido no Vercel
- [ ] Testar a aplicação em produção
- [ ] Verificar logs para erros
- [ ] Testar autenticação com PINs
- [ ] Verificar criação de novos restaurantes funciona

---

**Nota:** O deploy é **automático** após `git push` para `main`. Não é necessário fazer nada manualmente, exceto verificar que o deploy foi bem-sucedido.

