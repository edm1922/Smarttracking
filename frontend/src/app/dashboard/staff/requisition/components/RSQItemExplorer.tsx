'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertCircle,
  ArrowDownWideNarrow,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  ArrowUpDown,
  ArrowUpWideNarrow,
  Bell,
  Box,
  ChevronDown,
  Loader2,
  PackagePlus,
  Search,
  Sparkles,
  TrendingUp,
  Warehouse,
  X,
} from 'lucide-react';
import { Product } from './RSQTypes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const sortOptions = [
  { value: 'name-asc', label: 'A-Z', icon: ArrowUpWideNarrow },
  { value: 'name-desc', label: 'Z-A', icon: ArrowDownWideNarrow },
  { value: 'stock-high', label: 'High Stock', icon: Warehouse },
  { value: 'stock-low', label: 'Low Stock', icon: ArrowUpDown },
];

interface Notification {
  id: string;
  type: string;
  productId: string;
  productName: string;
  quantity: number;
  message: string;
  durationHours: number;
  createdAt: string;
  expiresAt: string;
}

interface MostRequested {
  productId: string;
  productName: string;
  requestCount: number;
}

interface RSQItemExplorerProps {
  locationId: string;
  onAddProduct: (product: Product) => void;
  canAddProducts: boolean;
  mostRequested: MostRequested[];
}

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 10;

export const RSQItemExplorer: React.FC<RSQItemExplorerProps> = ({
  locationId,
  onAddProduct,
  canAddProducts,
  mostRequested,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [products, setProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/stock-notifications/active');
      setNotifications(res.data || []);
    } catch {}
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const searchProducts = useCallback(async (query: string, page: number = 0, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsSearching(true);
    }

    try {
      const res = await api.get('/products', {
        params: {
          search: query.trim() || undefined,
          take: PAGE_SIZE,
          skip: page * PAGE_SIZE,
        },
      });
      const data = res.data.data || res.data || [];
      const total = res.data.total || data.length;
      if (append) {
        setProducts(prev => [...prev, ...data]);
      } else {
        setProducts(data);
      }
      setTotalCount(total);
      setHasSearched(true);
    } catch {
      if (!append) setProducts([]);
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    searchProducts('', 0, false);
  }, [searchProducts]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchProducts(value, 0, false);
    }, DEBOUNCE_MS);
  };

  const handleLoadMore = useCallback(() => {
    if (isSearching || isLoadingMore) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    searchProducts(searchQuery, nextPage, true);
  }, [currentPage, searchQuery, searchProducts, isSearching, isLoadingMore]);

  const loadMoreSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isSearching || isLoadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && products.length < totalCount) {
            handleLoadMore();
          }
        },
        { rootMargin: '250px 0px' }
      );
      if (node) observerRef.current.observe(node);
    },
    [isSearching, isLoadingMore, products.length, totalCount, handleLoadMore]
  );

  const handleQuickAdd = async (item: MostRequested) => {
    try {
      const res = await api.get('/products', {
        params: { search: item.productName, take: 1 },
      });
      const data = res.data.data || res.data || [];
      const product = data.find((p: Product) => p.id === item.productId) || data[0];
      if (product) {
        onAddProduct(product);
      }
    } catch {}
  };

  const getProductStock = (product: Product) => {
    return product.stocks?.find(s => s.location?.id === locationId)?.quantity || 0;
  };

  const displayProducts = [...products]
    .map(p => ({ ...p, totalStock: getProductStock(p) }))
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'stock-high': return (b.totalStock || 0) - (a.totalStock || 0);
        case 'stock-low': return (a.totalStock || 0) - (b.totalStock || 0);
        default: return a.name.localeCompare(b.name);
      }
    });

  const notifiedIds = new Set(notifications.map(n => n.productId));
  const notified = displayProducts.filter(p => notifiedIds.has(p.id));
  const rest = displayProducts.filter(p => !notifiedIds.has(p.id));
  const prioritizedProducts = [...notified, ...rest];

  const hasMore = products.length < totalCount;

  return (
    <aside className="sticky top-4">
      <Card>
        <CardHeader className="py-2.5 px-3 border-b">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xs font-bold">Materials</CardTitle>
            </div>
            {hasSearched && (
              <Badge variant="outline" className="text-[9px] tabular-nums px-1 py-0 h-4">
                {products.length} of {totalCount} items
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-2 p-3 pb-2">
          <div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                ref={searchInputRef}
                id="rsq-product-search"
                name="productSearch"
                type="search"
                autoComplete="off"
                placeholder="Type to search inventory..."
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value.toUpperCase())}
                className="pl-8 h-8 text-xs"
              />
              {isSearching && (
                <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1" aria-label="Sort products">
            {sortOptions.map(opt => {
              const Icon = opt.icon;
              const active = sortBy === opt.value;
              return (
                <Button
                  key={opt.value}
                  variant={active ? 'default' : 'secondary'}
                  size="xs"
                  onClick={() => setSortBy(opt.value)}
                  aria-pressed={active}
                  className="h-6 text-[10px] px-2 font-medium"
                >
                  <Icon className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                  {opt.label}
                </Button>
              );
            })}
          </div>

          {!canAddProducts && (
            <Alert className="py-1 px-2.5 border-amber-200 bg-amber-50">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 inline-block align-middle mr-1.5" />
              <AlertDescription className="text-[10px] text-amber-900 inline-block align-middle p-0">
                Tag employees first to add materials.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <ScrollArea className="h-[480px] max-h-[calc(100vh-14rem)]">
          <div className="space-y-1.5 px-3 pb-3">
            {notifications.length > 0 && (
              <div className="space-y-1" aria-label="Stock alerts">
                {notifications.map(n => {
                  const isIn = n.type === 'STOCK_IN';
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-2 rounded-lg border p-2 ${
                        isIn ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {isIn ? <ArrowRightFromLine className="h-3 w-3" aria-hidden="true" /> : <ArrowLeftFromLine className="h-3 w-3" aria-hidden="true" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">{n.productName}</p>
                        <p className="mt-0.5 text-[9px] leading-tight text-muted-foreground">{n.message}</p>
                      </div>
                      <Button variant="ghost" size="icon-xs" onClick={() => dismissNotification(n.id)} aria-label={`Dismiss ${n.productName} alert`} className="h-5 w-5 text-muted-foreground">
                        <X className="h-3 w-3" aria-hidden="true" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {!hasSearched && !isSearching && mostRequested.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <TrendingUp className="h-3 w-3" />
                  Most Requested
                </div>
                <div className="flex flex-wrap gap-1">
                  {mostRequested.slice(0, 8).map(item => (
                    <button
                      key={item.productId}
                      type="button"
                      onClick={() => handleQuickAdd(item)}
                      disabled={!canAddProducts}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[10px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                      <span className="max-w-20 truncate">{item.productName}</span>
                      <Badge variant="secondary" className="ml-0.5 text-[9px] h-3.5 px-0.5 py-0 flex items-center">{item.requestCount}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!hasSearched && !isSearching && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-3 py-6 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-muted-foreground ring-1 ring-border">
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <p className="mt-2 text-xs font-semibold text-foreground">Search Inventory</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Find items by product name or SKU above.</p>
              </div>
            )}

            {isSearching ? (
              <div className="space-y-1.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-lg border border-border p-2 flex items-center justify-between gap-2 animate-pulse">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Skeleton className="h-9 w-9 rounded-md shrink-0 bg-muted/60" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <Skeleton className="h-3 w-20 bg-muted/60" />
                        <Skeleton className="h-2.5 w-12 bg-muted/60" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Skeleton className="h-5 w-8 rounded-md bg-muted/60" />
                      <Skeleton className="h-7 w-7 rounded-md bg-muted/60" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {prioritizedProducts.map((product) => {
                  const isNotified = notifiedIds.has(product.id);
                  const stock = product.totalStock || 0;
                  return (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={`rounded-lg border p-2 transition-colors flex items-center justify-between gap-2 ${
                        isNotified ? 'border-amber-300 bg-amber-50/50' : 'border-border bg-card hover:border-primary/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border ${isNotified ? 'border-amber-200 bg-amber-100' : 'border-border bg-muted/30'}`}>
                          {product.imageUrl ? (
                            <img src={product.imageUrl} className="h-full w-full object-cover" alt={product.name} loading="lazy" />
                          ) : (
                            <Box className="h-4.5 w-4.5 text-muted-foreground/30" aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <h3 className="truncate text-xs font-bold text-foreground leading-tight">{product.name}</h3>
                            {isNotified && (
                              <span className="shrink-0 h-3.5 w-3.5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center" title="Active Alert">
                                <Bell className="h-2 w-2" />
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[9px] text-muted-foreground mt-0.5">{product.sku || 'No SKU'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={stock > 0 ? 'secondary' : 'destructive'} className="text-[9px] py-0 px-1 h-5 flex items-center font-semibold">
                          {stock} {product.unit || 'PCS'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => onAddProduct(product)}
                          disabled={!canAddProducts}
                          title="Add to Request"
                          className="h-7 w-7 border-dashed hover:border-primary hover:text-primary transition-all"
                        >
                          <PackagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {hasSearched && prioritizedProducts.length === 0 && !isSearching && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-3 py-6 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-muted-foreground ring-1 ring-border">
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <p className="mt-2 text-xs font-semibold text-foreground">No products found</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Try another product name or SKU.</p>
              </div>
            )}

            {isLoadingMore && (
              <div className="space-y-1.5 pt-1">
                {[...Array(2)].map((_, i) => (
                  <div key={`more-skel-${i}`} className="rounded-lg border border-border p-2 flex items-center justify-between gap-2 animate-pulse opacity-70">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Skeleton className="h-9 w-9 rounded-md shrink-0 bg-muted/60" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <Skeleton className="h-3 w-20 bg-muted/60" />
                        <Skeleton className="h-2.5 w-12 bg-muted/60" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Skeleton className="h-5 w-8 rounded-md bg-muted/60" />
                      <Skeleton className="h-7 w-7 rounded-md bg-muted/60" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div ref={loadMoreSentinelRef} className="h-4 w-full" />
          </div>
        </ScrollArea>
      </Card>
    </aside>
  );
};
