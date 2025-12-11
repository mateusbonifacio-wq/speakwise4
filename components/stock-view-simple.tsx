"use client";

import { useState, useMemo, useEffect, useTransition, useCallback, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import { deleteProductBatch, adjustBatchQuantity, markAsWaste } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { MapPin, Package, Search, Edit, Trash2, Plus, Minus, AlertTriangle } from "lucide-react";
import { EditBatchDialog } from "./edit-batch-dialog";
import { StatusBadge } from "./status-badge";
import { Badge } from "@/components/ui/badge";
import { getBatchStatus, groupBatchesByCategory, aggregateBatchesByProductNameCaseInsensitive } from "@/lib/stock-utils";
import { toast } from "sonner";
import type { Category, Location, Restaurant } from "@prisma/client";
import type { BatchWithRelations } from "@/lib/stock-utils";

// Componente memoizado para items do Stock Geral - melhora performance no mobile
const GeneralStockItem = memo(function GeneralStockItem({
  product,
  onClick,
}: {
  product: {
    displayName: string;
    totalQuantity: number;
    unit: string;
    locations: string[];
  };
  onClick: (name: string) => void;
}) {
  return (
    <div
      onClick={() => onClick(product.displayName)}
      className="bg-white rounded-xl shadow-sm p-4 mb-3 border border-gray-100 hover:shadow-md hover:border-indigo-300 transition-shadow cursor-pointer touch-manipulation"
      style={{ willChange: "transform" }}
    >
      {/* Product name */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-base md:text-lg font-semibold text-foreground">
          {product.displayName}
        </h3>
      </div>

      {/* Product details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium text-foreground">
            {product.totalQuantity || 0} {product.unit || "un"}
          </span>
        </div>
        {product.locations && product.locations.length > 0 && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {product.locations.length === 1
                ? product.locations[0]
                : `${product.locations.length} localizações`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

interface StockViewSimpleProps {
  batches: BatchWithRelations[];
  restaurant: Restaurant;
  categories: Category[];
  locations: Location[];
  initialStatusFilter?: string;
  initialSearchQuery?: string;
}

/**
 * Versão simplificada do StockView com Search bar
 */
export type StatusFilter = "all" | "expired" | "urgent" | "attention" | "ok";
export type TipoFilter = "mp" | "transformado" | "all" | "general";

export function StockViewSimple({
  batches,
  restaurant,
  categories,
  locations,
  initialStatusFilter,
  initialSearchQuery,
}: StockViewSimpleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Tab state: which tipo tab is active
  const [activeTab, setActiveTab] = useState<TipoFilter>("all");
  
  // Separate filter state per tab
  const [filters, setFilters] = useState<Record<TipoFilter, {
    statusFilter: StatusFilter;
    searchQuery: string;
    categoryFilter: string;
    locationFilter: string;
    showFinished: boolean;
  }>>({
    mp: {
      statusFilter: (initialStatusFilter && ["expired", "urgent", "attention", "ok"].includes(initialStatusFilter)
        ? initialStatusFilter
        : "all") as StatusFilter,
      searchQuery: "",
      categoryFilter: "",
      locationFilter: "",
      showFinished: false,
    },
    transformado: {
      statusFilter: "all",
      searchQuery: "",
      categoryFilter: "",
      locationFilter: "",
      showFinished: false,
    },
    all: {
      statusFilter: "all",
      searchQuery: "",
      categoryFilter: "",
      locationFilter: "",
      showFinished: false,
    },
    general: {
      statusFilter: "all",
      searchQuery: "",
      categoryFilter: "",
      locationFilter: "",
      showFinished: false,
    },
  });
  
  // Get current tab's filters
  const currentFilters = filters[activeTab];
  const statusFilter = currentFilters.statusFilter;
  const searchQuery = currentFilters.searchQuery;
  const categoryFilter = currentFilters.categoryFilter;
  const locationFilter = currentFilters.locationFilter;
  const showFinished = currentFilters.showFinished;
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchWithRelations | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState<BatchWithRelations | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [wasteDialogOpen, setWasteDialogOpen] = useState(false);
  const [wastingBatch, setWastingBatch] = useState<BatchWithRelations | null>(
    null
  );
  const [isMarkingWaste, setIsMarkingWaste] = useState(false);
  const [adjustingBatchId, setAdjustingBatchId] = useState<string | null>(null);
  // Optimistic updates: track local quantity changes before server confirms
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, number>>(new Map());

  // Update status filter and search query when props change (e.g., from navigation)
  // Usar useRef para evitar re-renders desnecessários
  const hasInitialized = useRef(false);
  useEffect(() => {
    // Só inicializar uma vez
    if (hasInitialized.current) return;
    
    let shouldUpdate = false;
    const updates: Partial<typeof filters> = {};
    
    if (initialStatusFilter && ["expired", "urgent", "attention", "ok"].includes(initialStatusFilter)) {
      updates[activeTab] = {
        ...filters[activeTab],
        statusFilter: initialStatusFilter as StatusFilter,
      };
      shouldUpdate = true;
    }
    
    if (initialSearchQuery) {
      updates.all = {
        ...filters.all,
        searchQuery: initialSearchQuery,
      };
      // Se há uma pesquisa inicial, mudar para o tab "Todos" para mostrar os resultados
      setActiveTab("all");
      shouldUpdate = true;
    }
    
    if (shouldUpdate) {
      setFilters(prev => ({ ...prev, ...updates }));
      hasInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStatusFilter, initialSearchQuery]);
  
  // Helper to update current tab's filters
  const updateCurrentFilters = (updates: Partial<typeof currentFilters>) => {
    setFilters(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        ...updates,
      },
    }));
  };

  const handleEdit = (batch: BatchWithRelations) => {
    if (!batch || !batch.id) {
      console.warn("Cannot edit batch: invalid batch or missing ID");
      return;
    }
    setEditingBatch(batch);
    setEditDialogOpen(true);
  };

  const handleDelete = (batch: BatchWithRelations) => {
    setDeletingBatch(batch);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingBatch) return;
    setIsDeleting(true);
    try {
      await deleteProductBatch(deletingBatch.id);
      toast.success("Entrada eliminada com sucesso");
    } catch (error) {
      toast.error("Erro ao eliminar entrada");
      console.error("Error deleting batch:", error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingBatch(null);
      router.refresh();
    }
  };

  const handleMarkAsWaste = (batch: BatchWithRelations) => {
    setWastingBatch(batch);
    setWasteDialogOpen(true);
  };

  const confirmMarkAsWaste = async () => {
    if (!wastingBatch) return;
    setIsMarkingWaste(true);
    try {
      await markAsWaste(wastingBatch.id);
      toast.success("Produto marcado como desperdício");
    } catch (error) {
      toast.error("Erro ao marcar como desperdício");
      console.error("Error marking as waste:", error);
    } finally {
      setIsMarkingWaste(false);
      setWasteDialogOpen(false);
      setWastingBatch(null);
      router.refresh();
    }
  };

  // Validação defensiva
  if (!batches || !Array.isArray(batches)) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-destructive">
          <p className="text-lg font-medium mb-2">Erro: dados inválidos</p>
        </CardContent>
      </Card>
    );
  }

  // Update URL when status filter changes (optional but useful for sharing/bookmarking)
  // CRITICAL FIX: router is stable, no need to memoize or include in deps
  const handleStatusFilterChange = (filter: StatusFilter) => {
    console.log("[StockViewSimple] Status filter changed:", filter);
    updateCurrentFilters({ statusFilter: filter });
    if (filter === "all") {
      router.push("/stock", { scroll: false });
    } else {
      router.push(`/stock?status=${filter}`, { scroll: false });
    }
  };

  // Handle quantity adjustment with optimistic update for instant UI feedback
  const handleAdjustQuantity = async (batchId: string, adjustment: number) => {
    // Find the batch to get current quantity
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    // Use optimistic quantity if available, otherwise use batch quantity
    const currentQuantity = optimisticUpdates.has(batchId)
      ? (optimisticUpdates.get(batchId) ?? batch.quantity)
      : batch.quantity;
    const newQuantity = Math.max(0, currentQuantity + adjustment);
    
    // Prevent adjustment if already at 0 and trying to decrease
    if (currentQuantity <= 0 && adjustment < 0) {
      return;
    }
    
    // Optimistic update: update UI immediately
    setOptimisticUpdates(prev => {
      const next = new Map(prev);
      next.set(batchId, newQuantity);
      return next;
    });
    setAdjustingBatchId(batchId);

    // Make server call in background
    startTransition(async () => {
      try {
        const result = await adjustBatchQuantity(batchId, adjustment);
        if (result.success) {
          // Success: refresh data from server
          // Keep optimistic update - it will be replaced when server data arrives
          router.refresh();
          // Clear optimistic update after refresh (useEffect will handle this when batches update)
        } else {
          // Error: revert optimistic update immediately
          setOptimisticUpdates(prev => {
            const next = new Map(prev);
            next.delete(batchId);
            return next;
          });
          toast.error("Erro ao ajustar quantidade", {
            description: result.error || "Ocorreu um erro ao ajustar a quantidade.",
          });
        }
      } catch (error) {
        // Error: revert optimistic update immediately
        setOptimisticUpdates(prev => {
          const next = new Map(prev);
          next.delete(batchId);
          return next;
        });
        console.error("Error adjusting quantity:", error);
        toast.error("Erro inesperado", {
          description: "Ocorreu um erro inesperado. Por favor, tente novamente.",
        });
      } finally {
        setAdjustingBatchId(null);
      }
    });
  };

  // Get categories filtered by tipo
  const filteredCategories = useMemo(() => {
    if (activeTab === "all") return categories;
    return categories.filter(cat => (cat as any).tipo === activeTab);
  }, [categories, activeTab]);

  // Filtrar batches baseado na pesquisa, filtro de status, tipo, categoria, localização e finished items
  // Não calcular se estiver no tab "general" (não é usado nesse caso)
  const filteredBatches = useMemo(() => {
    // Early return se estiver no tab general - não precisa filtrar
    if (activeTab === "general") return [];
    
    let filtered = batches;

    // Filter by tipo (product type)
    if (activeTab !== "all") {
      filtered = filtered.filter((batch) => (batch as any).tipo === activeTab);
    }

    // Filter by category
    if (categoryFilter) {
      filtered = filtered.filter((batch) => batch.category?.id === categoryFilter);
    }

    // Filter by location
    if (locationFilter) {
      filtered = filtered.filter((batch) => batch.location?.id === locationFilter);
    }

    // Filter by finished status (by default, hide finished items)
    if (!showFinished) {
      filtered = filtered.filter((batch) => (batch.quantity ?? 0) > 0);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((batch) => {
        const status = getBatchStatus(batch, restaurant);
        return status.status === statusFilter;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((batch) =>
        batch.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [batches, searchQuery, statusFilter, showFinished, restaurant, activeTab, categoryFilter, locationFilter]);

  // Agrupar por categoria
  const batchesByCategory = useMemo(
    () => groupBatchesByCategory(filteredBatches),
    [filteredBatches]
  );

  // Ordenar categorias
  const categoryNames = Object.keys(batchesByCategory).sort((a, b) => {
    return a.localeCompare(b);
  });

  // Agrupar produtos por nome (case-insensitive) para Stock Geral (excluindo expirados)
  // Calcula sempre (independentemente do tab ativo) para ter dados prontos quando necessário
  const generalStockComputed = useMemo(() => {
    // Early return se não houver dados
    if (!batches || !Array.isArray(batches) || batches.length === 0) return {};
    if (!restaurant) return {};
    
    try {
      return aggregateBatchesByProductNameCaseInsensitive(batches, restaurant);
    } catch (error) {
      console.error("Error aggregating general stock:", error);
      return {};
    }
  }, [batches, restaurant]);

  // Só usar o generalStock quando estiver no tab "general"
  const generalStock = activeTab === "general" ? generalStockComputed : {};

  // Ordenar produtos do Stock Geral alfabeticamente - só quando generalStock mudar
  // Otimizado para performance: cache de nomes ordenados
  const generalStockProductNames = useMemo(() => {
    if (activeTab !== "general") return [];
    if (!generalStockComputed || Object.keys(generalStockComputed).length === 0) return [];
    try {
      // Criar array de nomes com displayName para ordenação mais eficiente
      const namesWithDisplay = Object.entries(generalStockComputed).map(([key, product]) => ({
        key,
        displayName: product.displayName || "",
      }));
      
      // Ordenar apenas uma vez
      namesWithDisplay.sort((a, b) => a.displayName.localeCompare(b.displayName));
      
      // Retornar apenas as keys ordenadas
      return namesWithDisplay.map(item => item.key);
    } catch (error) {
      console.error("Error sorting general stock products:", error);
      return [];
    }
  }, [generalStockComputed, activeTab]);

  // Handler para navegar ao clicar num produto no Stock Geral - memoizado
  const handleGeneralStockProductClick = useCallback((productName: string) => {
    // Mudar para o tab "Todos" primeiro
    setActiveTab("all");
    // Atualizar o filtro de pesquisa no tab "all"
    setFilters(prev => ({
      ...prev,
      all: {
        ...prev.all,
        searchQuery: productName,
      },
    }));
    // Navegar com replace para evitar adicionar ao histórico
    // CRITICAL FIX: router is stable, don't include in deps
    router.replace(`/stock?search=${encodeURIComponent(productName)}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // router is stable, don't include in deps

  // Map status to badge type
  const getBadgeStatus = (status: ReturnType<typeof getBatchStatus>): "expired" | "urgent" | "attention" | "ok" => {
    if (status.status === "expired") return "expired";
    if (status.status === "urgent") return "urgent";
    if (status.status === "attention") return "attention";
    return "ok";
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Tipo Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("mp")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === "mp"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          Matérias-primas
        </button>
        <button
          onClick={() => setActiveTab("transformado")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === "transformado"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          Transformados
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === "all"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === "general"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          Stock Geral
        </button>
      </div>

      {/* Category and Location filters - Only show for non-general tabs */}
      {activeTab !== "general" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => updateCurrentFilters({ categoryFilter: e.target.value })}
              className="flex-1 h-11 md:h-10 text-base border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="">Todas as categorias</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={locationFilter}
              onChange={(e) => updateCurrentFilters({ locationFilter: e.target.value })}
              className="flex-1 h-11 md:h-10 text-base border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="">Todas as localizações</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Show finished toggle and status filters */}
          <div className="flex flex-col gap-3 mb-4">
            {/* Toggle to show finished items */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showFinished"
                checked={showFinished}
                onChange={(e) => updateCurrentFilters({ showFinished: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="showFinished" className="text-sm font-medium text-gray-700 cursor-pointer">
                Mostrar também esgotados
              </label>
            </div>

            {/* Status filters - Mobile-first pill buttons */}
            <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusFilterChange("all")}
          className={`py-1 px-3 rounded-full text-sm font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
          }`}
        >
          Todos
        </Button>
        <Button
          variant={statusFilter === "expired" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusFilterChange("expired")}
          className={`py-1 px-3 rounded-full text-sm font-medium transition-colors ${
            statusFilter === "expired"
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
          }`}
        >
          Expirados
        </Button>
        <Button
          variant={statusFilter === "urgent" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusFilterChange("urgent")}
          className={`py-1 px-3 rounded-full text-sm font-medium transition-colors ${
            statusFilter === "urgent"
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
          }`}
        >
          Urgente
        </Button>
        <Button
          variant={statusFilter === "attention" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusFilterChange("attention")}
          className={`py-1 px-3 rounded-full text-sm font-medium transition-colors ${
            statusFilter === "attention"
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
          }`}
        >
          Atenção
        </Button>
        <Button
          variant={statusFilter === "ok" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusFilterChange("ok")}
          className={`py-1 px-3 rounded-full text-sm font-medium transition-colors ${
            statusFilter === "ok"
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
          }`}
        >
          OK
        </Button>
        </div>
      </div>
        </>
      )}

      {/* Mobile-first search bar - Full width with border-gray-300 styling - Only show for non-general tabs */}
      {activeTab !== "general" && (
        <div className="relative w-full mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 md:h-5 md:w-5 -translate-y-1/2 text-muted-foreground z-10" />
          <Input
            placeholder="Pesquisar produto..."
            value={searchQuery}
            onChange={(e) => updateCurrentFilters({ searchQuery: e.target.value })}
            className="pl-10 md:pl-10 pr-4 h-11 md:h-10 text-base border-gray-300 rounded-lg w-full"
          />
        </div>
      )}

      {/* Stock Geral View */}
      {activeTab === "general" ? (
        generalStockProductNames.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                Ainda não existem produtos em stock
              </p>
              <p className="text-sm">
                Adicione uma entrada em "Nova Entrada".
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {generalStockProductNames.map((normalizedName) => {
              const product = generalStockComputed[normalizedName];
              
              // Verificação defensiva
              if (!product || !product.displayName) {
                return null;
              }
              
              return (
                <GeneralStockItem
                  key={normalizedName}
                  product={product}
                  onClick={handleGeneralStockProductClick}
                />
              );
            })}
          </div>
        )
      ) : filteredBatches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              {searchQuery || statusFilter !== "all" || showFinished
                ? "Nenhum produto encontrado"
                : "Ainda não existem produtos em stock"}
            </p>
            <p className="text-sm">
              {searchQuery || statusFilter !== "all"
                ? "Tente pesquisar por outro termo ou altere o filtro."
                : showFinished
                ? "Não existem produtos esgotados."
                : 'Adicione uma entrada em "Nova Entrada".'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {categoryNames.map((categoryName) => {
            const categoryBatches = batchesByCategory[categoryName];

            return (
              <div key={categoryName} className="space-y-3">
                {/* Category title */}
                <h2 className="text-lg font-semibold mb-2 text-foreground">
                  {categoryName}
                </h2>
                {/* Product entries */}
                {categoryBatches.map((batch) => {
                  const status = getBatchStatus(batch, restaurant);

                  // Use optimistic quantity if available, otherwise use batch quantity
                  const displayQuantity = optimisticUpdates.has(batch.id) 
                    ? (optimisticUpdates.get(batch.id) ?? batch.quantity)
                    : batch.quantity;
                  const isFinished = (displayQuantity ?? 0) <= 0;
                  const isAdjusting = adjustingBatchId === batch.id;
                  // Allow buttons to show if quantity > 0 (using optimistic value)
                  const canAdjust = displayQuantity > 0;

                  return (
                    <div
                      key={batch.id}
                      className={`bg-white rounded-xl shadow-sm p-4 mb-3 border border-gray-100 hover:shadow-md transition-shadow ${
                        isFinished ? "opacity-60" : ""
                      }`}
                    >
                      {/* Top row: Product name bold, status badge aligned right */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base md:text-lg font-semibold text-foreground">
                              {batch.name}
                            </h3>
                            {/* Finished badge */}
                            {isFinished && (
                              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                                Esgotado
                              </Badge>
                            )}
                            {/* Transformado badge */}
                            {(batch as any).tipo === "transformado" && (
                              <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                                Transformado
                              </Badge>
                            )}
                          </div>
                          {/* Display packaging and size info if available */}
                          {(batch.packagingType || (batch.size && batch.sizeUnit)) && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {[
                                batch.packagingType,
                                batch.size && batch.sizeUnit ? `${batch.size} ${batch.sizeUnit}` : null
                              ].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={getBadgeStatus(status)} label={status.label} />
                          {/* Edit/Delete buttons - Small icon buttons aligned right */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(batch)}
                            aria-label="Editar entrada"
                            disabled={isAdjusting || isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={() => handleMarkAsWaste(batch)}
                            aria-label="Marcar como desperdício"
                            disabled={isAdjusting || isPending}
                            title="Marcar como desperdício"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(batch)}
                            aria-label="Eliminar entrada"
                            disabled={isAdjusting || isPending}
                            title="Eliminar (sem registar desperdício)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Second row: Quantity with +/- buttons + Location */}
                      <div className="flex flex-col sm:flex-row gap-2 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium text-foreground">
                            {optimisticUpdates.has(batch.id) 
                              ? optimisticUpdates.get(batch.id) 
                              : batch.quantity} {batch.unit}
                          </span>
                          {/* Quantity adjustment buttons */}
                          {canAdjust && (
                            <div className="flex items-center gap-1 ml-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 text-sm border-gray-300 hover:bg-gray-50"
                                onClick={() => handleAdjustQuantity(batch.id, -1)}
                                disabled={isAdjusting && adjustingBatchId === batch.id}
                                aria-label="Diminuir quantidade"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 text-sm border-gray-300 hover:bg-gray-50"
                                onClick={() => handleAdjustQuantity(batch.id, 1)}
                                disabled={isAdjusting && adjustingBatchId === batch.id}
                                aria-label="Aumentar quantidade"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {batch.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{batch.location.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Third row: Expiry date */}
                      <div className="text-sm">
                        <span className="font-medium text-foreground">Validade: </span>
                        <span>
                          {format(
                            new Date(batch.expiryDate),
                            "dd/MM/yyyy"
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog de edição */}
      {editDialogOpen && editingBatch && editingBatch.id && categories && locations && (
        <EditBatchDialog
          batch={editingBatch}
          categories={categories}
          locations={locations}
          open={editDialogOpen}
          onOpenChange={(open: boolean) => {
            setEditDialogOpen(open);
            if (!open) {
              setEditingBatch(null);
            }
          }}
        />
      )}

      {/* Dialog de confirmação de desperdício */}
      <Dialog open={wasteDialogOpen} onOpenChange={setWasteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como desperdício</DialogTitle>
            <DialogDescription>
              Tem a certeza que deseja marcar este produto como desperdício? Esta
              ação irá registar o desperdício no histórico e remover o produto do stock.
            </DialogDescription>
          </DialogHeader>
          {wastingBatch && (
            <div className="py-4">
              <p className="font-medium">{wastingBatch.name}</p>
              <p className="text-sm text-muted-foreground">
                {wastingBatch.quantity} {wastingBatch.unit}
                {wastingBatch.location &&
                  ` • ${wastingBatch.location.name}`}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWasteDialogOpen(false)}
              disabled={isMarkingWaste}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmMarkAsWaste}
              disabled={isMarkingWaste}
            >
              {isMarkingWaste ? "A registar..." : "Sim, marcar como desperdício"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de eliminação */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar entrada</DialogTitle>
            <DialogDescription>
              Tem a certeza que deseja eliminar esta entrada de stock? Esta
              ação não pode ser desfeita e <strong>não será registada como desperdício</strong>.
              Use esta opção apenas para corrigir erros ou remover dados de teste.
            </DialogDescription>
          </DialogHeader>
          {deletingBatch && (
            <div className="py-4">
              <p className="font-medium">{deletingBatch.name}</p>
              <p className="text-sm text-muted-foreground">
                {deletingBatch.quantity} {deletingBatch.unit}
                {deletingBatch.location &&
                  ` • ${deletingBatch.location.name}`}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "A eliminar..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

