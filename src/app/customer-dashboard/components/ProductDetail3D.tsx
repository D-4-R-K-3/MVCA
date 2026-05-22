'use client';
import React, { useState, useEffect } from 'react';
import { RotateCcw, Maximize2, Smartphone, Info, ChevronRight, Camera, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ViewMode = 'photo' | '3d' | 'ar';

const rotationClasses = ['rotate-0', 'rotate-45', 'rotate-90', 'rotate-135', 'rotate-180', 'rotate-[225deg]', 'rotate-[270deg]', 'rotate-[315deg]'];
const scaleClasses = ['scale-50', 'scale-60', 'scale-70', 'scale-80', 'scale-90', 'scale-100', 'scale-110', 'scale-120', 'scale-125', 'scale-[1.35]', 'scale-150'];

interface ProductDetail3DProps {
  order?: any;
}

export default function ProductDetail3D({ order }: ProductDetail3DProps) {
  const supabase = createClient();
  const [viewMode, setViewMode] = useState<ViewMode>('photo');
  const [rotationIndex, setRotationIndex] = useState(0);
  const [scaleIndex, setScaleIndex] = useState(5);
  const [arStep, setArStep] = useState<'intro' | 'camera'>('intro');
  const [showInfo, setShowInfo] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!order?.product_id) return;
    const fetchProduct = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('id', order.product_id)
        .single();
      if (data) {
        setProduct({
          ...data,
          images: Array.isArray(data.images) ? data.images : [],
          specifications: typeof data.specifications === 'object' ? data.specifications : {},
        });
      }
      setLoading(false);
    };
    fetchProduct();
  }, [order?.product_id, supabase]);

  function handleRotate() { setRotationIndex(v => (v + 1) % rotationClasses.length); }
  function handleScaleUp() { setScaleIndex(v => Math.min(scaleClasses.length - 1, v + 1)); }
  function handleScaleDown() { setScaleIndex(v => Math.max(0, v - 1)); }

  const productName = product?.name || order?.product_name || 'Your Furniture';
  const productImage = product?.images?.[0] || '';
  const dimensions = product
    ? `${product.length_cm || 0}L × ${product.width_cm || 0}W × ${product.height_cm || 0}H cm`
    : order?.product_name ? 'Dimensions loading...' : '—';

  const specs = product?.specifications
    ? Object.entries(product.specifications).map(([k, v]) => ({ label: k, value: String(v) }))
    : [
        { label: 'Material', value: product?.material_type || order?.product_category || 'Wood' },
        { label: 'Dimensions', value: dimensions },
        { label: 'Lead Time', value: `${product?.estimated_production_days || 14} days` },
      ];

  const activeViewportClass = viewMode === 'photo' ?'bg-slate-100 dark:bg-slate-900' :'bg-gradient-to-br from-violet-200 via-purple-200 to-white dark:from-purple-950 dark:via-violet-900 dark:to-slate-950';

  const viewModes = [
    { key: 'photo' as ViewMode, label: 'Static Photo', desc: 'High-res product photo', emoji: '📷' },
    { key: '3d' as ViewMode, label: '3D Preview', desc: 'Interactive 3D model', emoji: '🎲' },
    { key: 'ar' as ViewMode, label: 'View in My Room', desc: 'AR placement mode', emoji: '🏠' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-purple-600 dark:text-purple-300" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            <div className={`relative min-h-[320px] overflow-hidden rounded-2xl border border-border ${activeViewportClass} transition-colors`}>

              {viewMode === 'photo' && (
                productImage ? (
                  <img src={productImage} alt={`${productName} product photo showing furniture details`} className="h-full w-full max-h-[320px] object-cover" />
                ) : (
                  <div className="flex h-full min-h-[320px] items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-3">🪑</div>
                      <p className="text-sm text-muted-foreground">{productName}</p>
                    </div>
                  </div>
                )
              )}

              {viewMode === '3d' && (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
                  <div className={`relative mb-6 ${rotationClasses[rotationIndex]} ${scaleClasses[scaleIndex]} transition-transform duration-300`}>
                    <div className="flex h-32 w-48 items-center justify-center rounded-2xl border border-border bg-muted/80 shadow-lg backdrop-blur-md">
                      <div className="text-center">
                        <div className="mb-2 text-5xl">🪑</div>
                        <p className="text-xs font-semibold text-foreground">{productName}</p>
                        <p className="text-[10px] text-muted-foreground">{dimensions}</p>
                      </div>
                    </div>
                    <div className="absolute -bottom-3 left-1/2 h-4 w-32 -translate-x-1/2 rounded-full bg-black/20 blur-md dark:bg-black/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">Drag to rotate · Pinch to zoom</p>
                  <p className="mt-1 text-xs text-muted-foreground">{dimensions}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    <button onClick={handleRotate} className="flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2 text-sm font-semibold text-foreground transition-all active:scale-95">
                      <RotateCcw size={14} /> Rotate
                    </button>
                    <button onClick={handleScaleUp} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted text-lg font-bold text-foreground transition-all active:scale-95">+</button>
                    <button onClick={handleScaleDown} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted text-lg font-bold text-foreground transition-all active:scale-95">−</button>
                    <button onClick={() => { setRotationIndex(0); setScaleIndex(5); }} className="flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2 text-sm font-semibold text-foreground transition-all active:scale-95">
                      <Maximize2 size={13} /> Reset
                    </button>
                  </div>
                </div>
              )}

              {viewMode === 'ar' && arStep === 'intro' && (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/30 bg-white/25 dark:border-white/20 dark:bg-white/10">
                    <Smartphone size={36} className="text-slate-900 dark:text-white" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">View in Your Room</h3>
                  <p className="mb-2 max-w-xs text-sm text-slate-700 dark:text-white/80">
                    Place your <strong>{productName}</strong> in your space. True-to-scale: {dimensions}
                  </p>
                  <div className="mb-6 w-full max-w-xs space-y-2 text-left">
                    {['Point camera at a flat floor surface', 'Tap to place the furniture', 'Pinch to resize · Drag to reposition'].map((step, i) => (
                      <div key={step} className="flex items-center gap-2.5">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-white/20 dark:text-white">{i + 1}</div>
                        <p className="text-xs text-slate-700 dark:text-white/80">{step}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setArStep('camera')} className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white transition-all active:scale-95 hover:bg-purple-700">
                    <Camera size={16} /> Open AR Camera <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {viewMode === 'ar' && arStep === 'camera' && (
                <div className="relative flex h-full min-h-[320px] items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-slate-950" />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(rgba(124,58,237,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.28)_1px,transparent_1px)] bg-[size:40px_40px] opacity-70" />
                  <div className={`relative z-10 text-center ${scaleClasses[scaleIndex]} transition-transform duration-300`}>
                    <div className="mx-auto flex h-28 w-40 items-center justify-center rounded-2xl border border-violet-300/60 bg-violet-400/25 backdrop-blur-sm dark:border-violet-200/40 dark:bg-violet-300/20">
                      <div className="text-center">
                        <div className="text-4xl">🪑</div>
                        <p className="mt-1 text-xs text-white/80">{productName}</p>
                        <p className="text-[10px] text-white/60">{dimensions}</p>
                      </div>
                    </div>
                    <div className="mx-auto mt-1 h-3 w-32 rounded-full bg-violet-500/40 blur-sm" />
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 px-4">
                    <button onClick={handleScaleDown} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/15 text-lg font-bold text-white backdrop-blur-sm">−</button>
                    <button onClick={handleRotate} className="flex items-center gap-1.5 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">
                      <RotateCcw size={14} /> Rotate
                    </button>
                    <button onClick={handleScaleUp} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/15 text-lg font-bold text-white backdrop-blur-sm">+</button>
                  </div>
                  <button onClick={() => setArStep('intro')} className="absolute left-3 top-3 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-semibold text-white">← Back</button>
                  <p className="absolute right-3 top-3 text-xs text-white/60">AR Mode · {dimensions}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:w-64">
            <div>
              <h3 className="mb-1 text-base font-semibold text-foreground">{productName}</h3>
              <p className="text-xs text-muted-foreground">
                {order?.order_ref ? `${order.order_ref} · ` : ''}{product?.material_type || product?.category || 'Furniture'}
              </p>
              {product && (
                <p className="text-xs text-muted-foreground mt-1">{dimensions}</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">View Mode</p>
              {viewModes.map(mode => {
                const isActive = viewMode === mode.key;
                return (
                  <button
                    key={mode.key}
                    onClick={() => { setViewMode(mode.key); if (mode.key !== 'ar') setArStep('intro'); }}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-all duration-150 active:scale-95 ${isActive ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-muted text-foreground hover:bg-muted/80'}`}
                  >
                    <span className="text-xl">{mode.emoji}</span>
                    <div>
                      <p className="font-semibold">{mode.label}</p>
                      <p className="text-xs text-muted-foreground">{mode.desc}</p>
                    </div>
                    {isActive && <div className="ml-auto h-2 w-2 rounded-full bg-purple-600 dark:bg-purple-300" />}
                  </button>
                );
              })}
            </div>

            <button onClick={() => setShowInfo(!showInfo)} className="flex w-full items-center justify-between rounded-xl border border-border bg-muted px-3 py-2.5 text-sm font-semibold text-foreground transition-all">
              <div className="flex items-center gap-2">
                <Info size={14} /> Product Specifications
              </div>
              <ChevronRight size={14} className={showInfo ? 'rotate-90 transition-transform' : 'transition-transform'} />
            </button>

            {showInfo && (
              <div className="space-y-2 rounded-xl border border-border bg-muted p-3">
                {specs.map(spec => (
                  <div key={spec.label} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">{spec.label}</span>
                    <span className="text-xs font-semibold text-foreground">{spec.value}</span>
                  </div>
                ))}
              </div>
            )}

            {viewMode !== 'ar' && (
              <button
                onClick={() => { setViewMode('ar'); setArStep('intro'); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground transition-all active:scale-95 hover:opacity-90"
              >
                <Smartphone size={16} /> View in AR
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}