# Contexto do Projeto Clearstok

## 📋 Resumo do Projeto

**Nome:** Clearstok (anteriormente ValidadeApp)  
**Tipo:** Next.js 14 App com Prisma + PostgreSQL  
**Deploy:** Vercel (deploy automático via GitHub)  
**Repository:** GitHub - `mateusbonifacio-wq/speakwise4`

## 🔗 Deploy & GitHub

### Configuração Vercel
- **Deploy automático:** Habilitado via GitHub
- **Branch:** `main`
- **Framework:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next` (padrão Next.js)

### Variáveis de Ambiente no Vercel
```
DATABASE_URL=postgresql://... (Connection Pooling - Session pooler)
DIRECT_URL=postgresql://... (Direct connection)
```
- **DATABASE_URL:** Usa pooler (porta 6543, `?pgbouncer=true`)
- **DIRECT_URL:** Usa conexão direta (porta 5432) para migrations
- **Base de dados:** Supabase PostgreSQL

### GitHub Repository
- **URL:** https://github.com/mateusbonifacio-wq/speakwise4.git
- **Branch principal:** `main`
- **Deploy trigger:** Push automático para `main` → Vercel faz deploy

## 🔐 Sistema de Autenticação

### PINs e Restaurantes
```typescript
// lib/auth.ts
PIN_TO_RESTAURANT: {
  "1111": "A",
  "2222": "B",
  "3333": "C",
  "4921": "D",
  "5421": "E",  // NOVOS
  "6531": "F",  // NOVOS
  "7641": "G",  // NOVOS
  "8751": "H",  // NOVOS
  "9861": "I",  // NOVOS
  "1357": "J"   // NOVOS
}
```

### Autenticação
- **Cliente:** `localStorage` (`clearskok_authenticated`, `clearskok_restaurantId`)
- **Servidor:** Cookie `clearskok_restaurantId` (sync com localStorage)
- **Guarda:** `AuthGuard` component + `useAuth` hook

### Rotas Protegidas
- `/hoje` (dashboard)
- `/nova-entrada` ou `/entries/new`
- `/stock`
- `/definicoes` ou `/settings`

### Rotas Públicas
- `/` (landing page)
- `/acesso` (PIN entry)

## 🗄️ Base de Dados (Prisma)

### Schema Principal
```prisma
Restaurant (name, alertDaysBeforeExpiry)
  └── ProductBatch (name, quantity, unit, expiryDate, homemade, status, ...)
  └── Category (name, alertDaysBeforeExpiry, warningDaysBeforeExpiry)
  └── Location (name)
  └── User (email, name)

ProductBatch {
  - id, name, quantity, unit
  - expiryDate
  - packagingType, size, sizeUnit (opcional)
  - homemade (boolean, default false)
  - status: ACTIVE | USED | DISCARDED | EXPIRED
  - restaurantId, categoryId, locationId, userId
}
```

### Multi-tenancy
- Todos os dados são scoped por `restaurantId`
- Restaurantes criados automaticamente no primeiro login
- Cada restaurante tem categorias/locations padrão:
  - Categorias: "Frescos", "Congelados", "Secos"
  - Localizações: "Frigorífico 1", "Despensa", "Arca"

## 🚀 Funcionalidades Implementadas

### 1. Gestão de Stock
- ✅ Lista de produtos por categoria
- ✅ Filtros por status (Todos, Expirados, Urgente, Atenção, OK)
- ✅ Pesquisa por nome de produto
- ✅ Botões +/- para ajustar quantidade
- ✅ Marcação automática como "USED" quando quantity = 0
- ✅ Toggle para mostrar/esconder produtos esgotados
- ✅ Badge "Esgotado" para produtos com quantity = 0
- ✅ Badge "Feito na casa" para produtos homemade

### 2. Nova Entrada
- ✅ Formulário completo com todos os campos
- ✅ Botões rápidos de validade: "Hoje", "+1 dia", "+3 dias", "+7 dias"
- ✅ Checkbox "Feito na casa" (homemade)
- ✅ Detalhes opcionais colapsáveis (Tipo de Embalagem, Tamanho/Volume)
- ✅ Toast notifications para sucesso/erro
- ✅ Reset automático do formulário após sucesso

### 3. Edição de Entradas
- ✅ Dialog para editar entrada existente
- ✅ Botões rápidos de validade também no dialog
- ✅ Todos os campos editáveis incluindo homemade
- ✅ Validação e tratamento de erros

### 4. Dashboard (/hoje)
- ✅ 4 cards de status: Expirados, Urgente, Atenção, OK
- ✅ Cards clicáveis → navegam para `/stock?status=X`
- ✅ Lista de produtos urgentes/expirando

### 5. Definições (/definicoes)
- ✅ Configuração de alertas gerais
- ✅ Gestão de categorias (criar, editar alertas, eliminar)
- ✅ Gestão de localizações (criar, eliminar)
- ✅ Alertas por categoria (urgent/warning days)

### 6. Performance
- ✅ Otimizações de queries Prisma (select apenas campos necessários)
- ✅ `revalidatePath` otimizado (tipo "page")
- ✅ Menos `router.refresh()` calls
- ✅ Remoção de serialização JSON desnecessária

## 📁 Estrutura de Ficheiros Importantes

```
app/
  ├── actions.ts          # Server actions (create/update/delete)
  ├── layout.tsx          # Root layout (inclui Analytics + Speed Insights)
  ├── page.tsx            # Landing page (/)
  ├── acesso/page.tsx     # PIN entry page
  ├── hoje/page.tsx       # Dashboard
  ├── nova-entrada/       # New entry form
  ├── stock/page.tsx      # Stock list
  └── definicoes/         # Settings

components/
  ├── auth-guard.tsx      # Route protection
  ├── new-entry-form.tsx  # New entry form (client)
  ├── edit-batch-dialog.tsx # Edit dialog
  ├── stock-view-simple.tsx # Stock list (client)
  ├── settings-content.tsx  # Settings (client)
  └── status-badge.tsx    # Status badge component

lib/
  ├── auth.ts             # PIN mapping, auth utilities
  ├── data-access.ts      # getRestaurantByTenantId, getUser
  ├── db.ts               # Prisma client instance
  └── stock-utils.ts      # Stock calculation utilities

prisma/
  └── schema.prisma       # Database schema
```

## 🔧 Comandos Importantes

### Desenvolvimento Local
```bash
npm install              # Instalar dependências
npm run dev              # Servidor local (http://localhost:3000)
npm run build            # Build de produção
```

### Base de Dados
```bash
npx prisma migrate dev   # Criar migration e aplicar (dev)
npx prisma migrate deploy # Aplicar migrations (produção)
npx prisma studio        # Abrir Prisma Studio
npx prisma generate      # Gerar Prisma Client
```

### Deploy
```bash
git add .
git commit -m "mensagem"
git push                  # Trigger deploy automático no Vercel
```

## ⚙️ Configurações Importantes

### Prisma Client
- Reutilização de instância global (dev mode)
- Logging apenas de erros em produção

### Next.js
- `dynamic = "force-dynamic"` em todas as rotas protegidas
- Server components para data fetching
- Client components para interatividade

### Autenticação
- Cookie `clearskok_restaurantId` válido por 7 dias
- Sync automático entre localStorage e cookie
- Redirect automático para `/acesso` se não autenticado

## 🐛 Problemas Conhecidos e Soluções

### Deploy no Vercel
1. **Erro de conexão à BD:** Verificar `DATABASE_URL` e `DIRECT_URL` estão corretos
   - DATABASE_URL: pooler (porta 6543)
   - DIRECT_URL: direto (porta 5432)
2. **Migrations pendentes:** Rodar `npx prisma migrate deploy` no Vercel via CLI ou adicionar no build

### Performance
- Queries otimizadas com `select` apenas campos necessários
- `revalidatePath` com tipo "page" para cache mais eficiente
- Menos re-renders desnecessários

## 📦 Dependências Principais

```json
{
  "next": "14.2.16",
  "react": "^18",
  "prisma": "^5.22.0",
  "@prisma/client": "^5.22.0",
  "@vercel/analytics": "^1.2.0",
  "@vercel/speed-insights": "^1.0.3",
  "date-fns": "^3.0.0",
  "sonner": "^1.4.0",  // Toast notifications
  "lucide-react": "^0.400.0",  // Icons
  "tailwindcss": "^3.4.1"
}
```

## 🎨 Design System

- **Framework UI:** Tailwind CSS + shadcn/ui components
- **Estilo:** Mobile-first, responsivo
- **Cores principais:** Indigo (botões primários)
- **Badges de status:**
  - Expirado: Vermelho
  - Urgente: Laranja
  - Atenção: Amarelo
  - OK: Verde
  - Esgotado: Cinza
  - Feito na casa: Verde claro

## 📝 Notas de Desenvolvimento

### Convenções de Código
- Server actions retornam `{ success: boolean, message?: string, error?: string }`
- Validação de ownership de restaurante em todas as operações
- Tratamento de erros robusto com mensagens claras
- Toast notifications para feedback ao utilizador
- Loading states em todas as operações assíncronas

### Estado Atual
- ✅ 10 restaurantes suportados (A-J)
- ✅ Sistema de autenticação PIN funcional
- ✅ Multi-tenancy completo
- ✅ Performance otimizada
- ✅ Funcionalidades principais implementadas
- ✅ Deploy automático no Vercel configurado

## 🔄 Próximos Passos Sugeridos

1. Testar os novos PINs (E-J) após deploy
2. Verificar criação automática de restaurantes
3. Monitorizar performance no Vercel Speed Insights
4. Adicionar mais funcionalidades conforme necessário

---

**Última atualização:** 2025-11-21  
**Commit mais recente:** `cec1d2e` - feat: add support for restaurants E-J (6 new PINs)

