"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths } from "date-fns";
import { pt } from "date-fns/locale";
import { Package, BarChart3, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { aggregateEventsByProduct, calculateMonthlySummary, type MonthlySummary, type ProductSummary } from "@/lib/history-utils";

interface HistoryContentProps {
  restaurantId: string;
}

interface StockEvent {
  id: string;
  type: "ENTRY" | "WASTE";
  productName: string;
  quantity: number;
  unit: string;
  createdAt: Date;
}

export function HistoryContent({ restaurantId }: HistoryContentProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Default to current month
    const now = new Date();
    return format(now, "yyyy-MM");
  });

  const [events, setEvents] = useState<StockEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate list of available months (last 12 months)
  const availableMonths = useMemo(() => {
    const months: { value: string; label: string }[] = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const monthDate = subMonths(now, i);
      const value = format(monthDate, "yyyy-MM");
      const label = format(monthDate, "MMMM yyyy", { locale: pt });
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    
    return months;
  }, []);

  // Fetch events for selected month
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        console.log(`[HistoryContent] Fetching events for month: ${selectedMonth}, restaurantId: ${restaurantId}`);
        
        const response = await fetch(`/api/history?month=${selectedMonth}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Erro ao carregar histórico");
        }

        const data = await response.json();
        console.log(`[HistoryContent] Received ${data.events?.length || 0} events`);
        
        // Convert createdAt strings to Date objects
        const eventsWithDates = (data.events || []).map((event: any) => ({
          ...event,
          createdAt: new Date(event.createdAt),
        }));
        
        setEvents(eventsWithDates);
      } catch (error) {
        console.error("[HistoryContent] Error fetching history:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [restaurantId, selectedMonth]);

  // Calculate summary statistics with robust handling
  const summary: MonthlySummary = useMemo(() => {
    return calculateMonthlySummary(events);
  }, [events]);

  // Calculate product summaries with normalized names
  const { withEntryData, withoutEntryData } = useMemo(() => {
    return aggregateEventsByProduct(events);
  }, [events]);

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Histórico & Encomendas"
        description="Analisa o histórico de encomendas e desperdício para tomar melhores decisões."
      />

      {/* Month selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Período</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Selecione um mês" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">A carregar...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Encomendado</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.totalOrdered.toFixed(1)} {summary.unit}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total de entradas no mês
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estragado</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {summary.totalWasted.toFixed(1)} {summary.unit}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total de desperdício no mês
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Desperdício</CardTitle>
                {summary.wastePercentage !== null && summary.wastePercentage > 15 ? (
                  <TrendingUp className="h-4 w-4 text-destructive" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-600" />
                )}
              </CardHeader>
              <CardContent>
                {summary.hasEnoughData && summary.wastePercentage !== null ? (
                  <>
                    <div className="text-2xl font-bold">
                      {summary.wastePercentage.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Do total encomendado
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-medium text-muted-foreground">
                      Ainda sem dados suficientes
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.totalOrdered === 0
                        ? "Sem entradas para calcular"
                        : "Dados insuficientes para percentagem"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Product table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Análise por Produto</CardTitle>
            </CardHeader>
            <CardContent>
              {withEntryData.length === 0 && withoutEntryData.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p>Nenhum evento registado para este mês.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Products with entry data */}
                  {withEntryData.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">
                        Produtos com histórico de encomenda
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-2 font-medium">Produto</th>
                              <th className="text-right py-2 px-2 font-medium">Encomendado</th>
                              <th className="text-right py-2 px-2 font-medium">Estragado</th>
                              <th className="text-right py-2 px-2 font-medium">% Desperdício</th>
                              <th className="text-left py-2 px-2 font-medium">Sugestão</th>
                            </tr>
                          </thead>
                          <tbody>
                            {withEntryData.map((product) => (
                              <tr key={`${product.normalizedName}-${product.unit}`} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-2 font-medium">{product.productName}</td>
                                <td className="text-right py-3 px-2">
                                  {product.totalOrdered.toFixed(1)} {product.unit}
                                </td>
                                <td className="text-right py-3 px-2 text-destructive">
                                  {product.totalWasted.toFixed(1)} {product.unit}
                                </td>
                                <td className="text-right py-3 px-2">
                                  {product.wastePercentage !== null ? (
                                    <span
                                      className={
                                        product.wastePercentage > 30
                                          ? "text-destructive font-semibold"
                                          : product.wastePercentage > 15
                                          ? "text-orange-600 font-medium"
                                          : "text-muted-foreground"
                                      }
                                    >
                                      {product.wastePercentage.toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      —
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-2 text-sm text-muted-foreground hidden md:table-cell">
                                  {product.suggestion}
                                </td>
                                {/* Mobile: Show suggestion below on small screens */}
                                <td className="md:hidden py-3 px-2">
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {product.suggestion}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Products without entry data (old stock) */}
                  {withoutEntryData.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                        Produtos sem base de entrada neste mês
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-2 font-medium">Produto</th>
                              <th className="text-right py-2 px-2 font-medium">Estragado</th>
                              <th className="text-left py-2 px-2 font-medium">Nota</th>
                            </tr>
                          </thead>
                          <tbody>
                            {withoutEntryData.map((product) => (
                              <tr key={`${product.normalizedName}-${product.unit}`} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-2 font-medium">{product.productName}</td>
                                <td className="text-right py-3 px-2 text-destructive">
                                  {product.totalWasted.toFixed(1)} {product.unit}
                                </td>
                                <td className="py-3 px-2 text-sm text-muted-foreground">
                                  {product.suggestion}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
