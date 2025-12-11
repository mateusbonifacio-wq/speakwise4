# Correção de Loops de Renderização/Navegação

## Problema Identificado

A aplicação apresentava comportamento intermitente e "aos saltos" ao navegar para páginas críticas como "Entrar", "Nova Entrada" e "Stock". Os sintomas incluíam:
- Interface a piscar constantemente
- Loops de navegação/re-render
- App "lagada" e às vezes sem resposta

## Causas Raiz Encontradas

### 1. **app/acesso/page.tsx** - Loop de verificação de sessão
**Problema:**
- `useEffect` usava `useState` para controlar se a sessão já foi verificada
- Cada mudança de estado causava re-render, potencialmente disparando o efeito novamente
- `router.replace("/hoje")` podia causar re-renders em cascata

**Correção:**
- Substituído `useState` por `useRef` para `hasCheckedSession`
- `useRef` não causa re-renders quando atualizado
- Adicionado logging para debug
- Removido `router` das dependências (é estável)

**Ficheiro:** `app/acesso/page.tsx` (linhas 28-58)

---

### 2. **app/onboarding/page.tsx** - Loop de verificação de nome
**Problema:**
- `useEffect` tinha `router` nas dependências
- `router` pode mudar de referência, causando re-execução do efeito
- Verificação de nome existente podia disparar múltiplos redirects

**Correção:**
- Substituído controle por `useRef` em vez de state
- Removido `router` das dependências (é estável)
- Adicionado guard para executar apenas uma vez
- Adicionado logging para debug

**Ficheiro:** `app/onboarding/page.tsx` (linhas 22-43)

---

### 3. **components/stock-view-wrapper.tsx** - Re-renders desnecessários
**Problema:**
- `useEffect` tinha `batches` e `restaurant` nas dependências
- Objetos podem mudar de referência mesmo com os mesmos dados
- Causava conversão de dados desnecessária em cada render

**Correção:**
- Adicionado `useRef` para rastrear `batches.length` e `restaurant.id`
- Só converte dados quando valores realmente mudam
- Evita re-renders desnecessários do componente filho

**Ficheiro:** `components/stock-view-wrapper.tsx` (linhas 37-110)

---

### 4. **components/stock-view-simple.tsx** - Callbacks com router nas deps
**Problema:**
- `handleGeneralStockProductClick` tinha `router` nas dependências do `useCallback`
- `router` é estável mas incluí-lo nas deps pode causar re-criação desnecessária
- `handleStatusFilterChange` também usava router diretamente

**Correção:**
- Removido `router` das dependências do `useCallback`
- Adicionado comentário explicativo
- Adicionado logging para debug

**Ficheiro:** `components/stock-view-simple.tsx` (linhas 245-252, 385-399)

---

### 5. **hooks/use-auth.ts** - useAuthGuard com router nas deps
**Problema:**
- `useAuthGuard` tinha `router` nas dependências do `useEffect`
- Podia causar loops infinitos se router mudasse de referência

**Correção:**
- Removido `router` das dependências (é estável)
- Adicionado `useRef` para prevenir múltiplos redirects
- Adicionado logging para debug

**Ficheiro:** `hooks/use-auth.ts` (linhas 108-127)

---

### 6. **components/sync-auth-cookie.tsx** - Sincronização excessiva
**Problema:**
- Executava em cada mudança de `pathname`, mesmo quando valores não mudavam
- Causava atualizações de cookie desnecessárias

**Correção:**
- Adicionado `useRef` para rastrear último `pathname` e `restaurantId`
- Só sincroniza quando valores realmente mudam
- Adicionado logging para debug

**Ficheiro:** `components/sync-auth-cookie.tsx` (linhas 12-60)

---

## Padrões de Correção Aplicados

### 1. Substituir `useState` por `useRef` para flags
**Quando usar:**
- Flags que controlam execução única de efeitos
- Valores que não precisam causar re-render quando mudam

**Exemplo:**
```tsx
// ❌ ANTES - causa re-render
const [hasChecked, setHasChecked] = useState(false);

// ✅ DEPOIS - não causa re-render
const hasCheckedRef = useRef(false);
```

### 2. Remover `router` das dependências
**Quando usar:**
- `router` do Next.js é estável e não muda de referência
- Incluí-lo nas deps é desnecessário e pode causar problemas

**Exemplo:**
```tsx
// ❌ ANTES
useEffect(() => {
  router.push("/hoje");
}, [router]);

// ✅ DEPOIS
useEffect(() => {
  router.push("/hoje");
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // router is stable
```

### 3. Adicionar guards para execução única
**Quando usar:**
- Efeitos que devem executar apenas uma vez
- Verificações que podem causar loops se executadas múltiplas vezes

**Exemplo:**
```tsx
const hasCheckedRef = useRef(false);

useEffect(() => {
  if (hasCheckedRef.current) return;
  hasCheckedRef.current = true;
  // ... lógica
}, []);
```

### 4. Memoizar conversões de dados
**Quando usar:**
- Conversões pesadas de dados
- Quando objetos podem mudar de referência mas ter os mesmos dados

**Exemplo:**
```tsx
const lengthRef = useRef(data?.length);
const idRef = useRef(data?.id);

useEffect(() => {
  if (lengthRef.current === data?.length && idRef.current === data?.id) {
    return; // Skip if unchanged
  }
  // ... converter dados
}, [data]);
```

## Ficheiros Alterados

1. `app/acesso/page.tsx`
2. `app/onboarding/page.tsx`
3. `components/stock-view-wrapper.tsx`
4. `components/stock-view-simple.tsx`
5. `hooks/use-auth.ts` (já corrigido anteriormente)
6. `components/sync-auth-cookie.tsx` (já corrigido anteriormente)
7. `components/auth-guard.tsx` (já corrigido anteriormente)

## Resultado Esperado

Após estas correções:
- ✅ Navegação fluida sem piscar
- ✅ Sem loops de renderização
- ✅ App responsiva e estável
- ✅ Logging adicionado para facilitar debug futuro

## Como Testar

1. Abrir consola do browser (F12)
2. Navegar para `/acesso` e verificar logs
3. Fazer login e verificar se não há loops
4. Navegar para `/nova-entrada` e verificar estabilidade
5. Navegar para `/stock` e verificar performance
6. Verificar que não há múltiplos logs do mesmo componente

## Notas Adicionais

- Todos os `router.push/replace` foram verificados
- Todos os `useEffect` com navegação foram otimizados
- Logging foi adicionado para facilitar debug futuro
- Padrões foram documentados para evitar problemas futuros

