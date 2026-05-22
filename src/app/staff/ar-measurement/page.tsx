'use client';

import React, { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Camera, Play, RotateCcw, Save, CheckCircle2, AlertTriangle, Loader2, Ruler, Target, X, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import StatusBadge from '@/components/ui/StatusBadge';

interface Measurement {
  width: number | null;
  height: number | null;
  depth: number | null;
  unit: 'cm' | 'inches';
}

interface Blueprint {
  width: number;
  height: number;
  depth: number;
}

interface Variance {
  width: number | null;
  height: number | null;
  depth: number | null;
}

interface SavedMeasurement {
  id: string;
  order_id: string | null;
  stage_name: string;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  expected_width_cm: number | null;
  expected_height_cm: number | null;
  expected_depth_cm: number | null;
  tolerance_cm: number;
  variance_width: number | null;
  variance_height: number | null;
  variance_depth: number | null;
  measurement_status: string;
  notes: string;
  created_at: string;
  orders?: { order_ref: string; product_name: string } | null;
}

const STAGE_OPTIONS = ['cutting', 'assembly', 'sanding', 'staining', 'finishing', 'quality_check'];

function cmToInches(cm: number): number {
  return Math.round(cm * 0.393701 * 10) / 10;
}

function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54 * 10) / 10;
}

function simulateARMeasurement(): Measurement {
  return {
    width: Math.round((Math.random() * 60 + 60) * 10) / 10,
    height: Math.round((Math.random() * 80 + 60) * 10) / 10,
    depth: Math.round((Math.random() * 40 + 20) * 10) / 10,
    unit: 'cm',
  };
}

export default function ARMeasurementPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [measurement, setMeasurement] = useState<Measurement>({ width: null, height: null, depth: null, unit: 'cm' });
  const [blueprint, setBlueprint] = useState<Blueprint>({ width: 120, height: 75, depth: 90 });
  const [tolerance, setTolerance] = useState(1.0);
  const [variance, setVariance] = useState<Variance>({ width: null, height: null, depth: null });
  const [measurementStatus, setMeasurementStatus] = useState<'within_tolerance' | 'out_of_tolerance' | 'pending'>('pending');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedStage, setSelectedStage] = useState('cutting');
  const [notes, setNotes] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [history, setHistory] = useState<SavedMeasurement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showBlueprint, setShowBlueprint] = useState(true);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const [ordersResult, measurementsResult] = await Promise.all([
        supabase.from('orders').select('id, order_ref, product_name').order('created_at', { ascending: false }).limit(20),
        supabase.from('measurements').select('*, orders(order_ref, product_name)').order('created_at', { ascending: false }).limit(20),
      ]);
      const ordersData = ordersResult.data;
      const measurementsData = measurementsResult.data;
      if (ordersData) setOrders(ordersData);
      if (measurementsData) setHistory(measurementsData as SavedMeasurement[]);
      setHistoryLoading(false);
    };
    fetchData();
  }, [user, supabase]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      showToast('error', 'Camera access denied. Please allow camera permissions.');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setMeasuring(false);
    setCalibrated(false);
  }

  async function calibrate() {
    setCalibrating(true);
    await new Promise((r) => setTimeout(r, 1500));
    setCalibrating(false);
    setCalibrated(true);
    showToast('success', 'Calibration complete. Ready to measure.');
  }

  async function startMeasurement() {
    if (!calibrated) {
      showToast('error', 'Please calibrate first before measuring.');
      return;
    }
    setMeasuring(true);
    setMeasurement({ width: null, height: null, depth: null, unit: 'cm' });
    setVariance({ width: null, height: null, depth: null });
    setMeasurementStatus('pending');
    setSaved(false);

    // Simulate progressive AR measurement
    await new Promise((r) => setTimeout(r, 800));
    const m = simulateARMeasurement();
    setMeasurement(m);

    // Calculate variance
    if (m.width !== null && m.height !== null && m.depth !== null) {
      const vWidth = Math.round((m.width - blueprint.width) * 10) / 10;
      const vHeight = Math.round((m.height - blueprint.height) * 10) / 10;
      const vDepth = Math.round((m.depth - blueprint.depth) * 10) / 10;
      setVariance({ width: vWidth, height: vHeight, depth: vDepth });

      const isOutOfTolerance =
        Math.abs(vWidth) > tolerance ||
        Math.abs(vHeight) > tolerance ||
        Math.abs(vDepth) > tolerance;
      setMeasurementStatus(isOutOfTolerance ? 'out_of_tolerance' : 'within_tolerance');
    }
    setMeasuring(false);

    // Capture frame
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
    }
  }

  function retake() {
    setMeasurement({ width: null, height: null, depth: null, unit: 'cm' });
    setVariance({ width: null, height: null, depth: null });
    setMeasurementStatus('pending');
    setCapturedImage(null);
    setSaved(false);
  }

  async function saveMeasurement() {
    if (!user || measurement.width === null) return;
    setSaving(true);
    try {
      const widthCm = measurement.unit === 'cm' ? measurement.width : inchesToCm(measurement.width!);
      const heightCm = measurement.unit === 'cm' ? measurement.height : inchesToCm(measurement.height!);
      const depthCm = measurement.unit === 'cm' ? measurement.depth : inchesToCm(measurement.depth!);

      const { data, error } = await supabase.from('measurements').insert({
        order_id: selectedOrderId || null,
        stage_name: selectedStage,
        inspector_id: user.id,
        width_cm: widthCm,
        height_cm: heightCm,
        depth_cm: depthCm,
        expected_width_cm: blueprint.width,
        expected_height_cm: blueprint.height,
        expected_depth_cm: blueprint.depth,
        tolerance_cm: tolerance,
        variance_width: variance.width,
        variance_height: variance.height,
        variance_depth: variance.depth,
        measurement_status: measurementStatus,
        unit: measurement.unit,
        notes,
        image_url: capturedImage || '',
      }).select().single();

      if (error) throw error;

      // Refresh history
      const { data: measurementsData } = await supabase
        .from('measurements')
        .select('*, orders(order_ref, product_name)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (measurementsData) setHistory(measurementsData as SavedMeasurement[]);

      setSaved(true);
      showToast('success', 'Measurement saved successfully');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save measurement');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const displayValue = (val: number | null) => {
    if (val === null) return '—';
    if (measurement.unit === 'inches') return `${cmToInches(val)}"`;
    return `${val}cm`;
  };

  const varianceColor = (v: number | null) => {
    if (v === null) return 'text-muted-foreground';
    if (Math.abs(v) <= tolerance) return 'text-success';
    return 'text-danger';
  };

  const varianceLabel = (v: number | null) => {
    if (v === null) return '—';
    const sign = v > 0 ? '+' : '';
    return `${sign}${v}cm`;
  };

  return (
    <AppLayout role="staff" currentPath="/staff/ar-measurement">
      <div className="space-y-6">
        {/* Toast */}
        {toast && (
          <div
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold"
            style={{ background: toast.type === 'success' ? '#22C55E' : '#EF4444', color: '#fff' }}
          >
            {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.3em] mb-2">AR Inspection Tool</p>
            <h1 className="text-3xl font-bold text-foreground">AR Visualization</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Measure furniture dimensions using camera with AR overlay. Compare against blueprint specifications and auto-fail QA if outside tolerance.
            </p>
          </div>
          <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary flex items-center gap-2">
            <Ruler size={16} /> {showHistory ? 'Hide History' : 'Measurement History'}
          </button>
        </div>

        {/* Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Stage</label>
            <select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)} className="input-dark w-full">
              {STAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Order</label>
            <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)} className="input-dark w-full">
              <option value="">Select order...</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>{o.order_ref} — {o.product_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Tolerance (cm)</label>
            <select value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} className="input-dark w-full">
              <option value={0.5}>±0.5cm (Strict)</option>
              <option value={1.0}>±1.0cm (Standard)</option>
              <option value={2.0}>±2.0cm (Relaxed)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Unit</label>
            <div className="flex gap-2 p-1 rounded-xl bg-muted">
              <button
                onClick={() => setMeasurement((m) => ({ ...m, unit: 'cm' }))}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${measurement.unit === 'cm' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              >
                cm
              </button>
              <button
                onClick={() => setMeasurement((m) => ({ ...m, unit: 'inches' }))}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${measurement.unit === 'inches' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              >
                inches
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Camera Panel */}
          <div className="xl:col-span-2 space-y-4">
            <div className="card-dark rounded-3xl border border-border overflow-hidden">
              {/* Camera View */}
              <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  style={{ display: cameraActive && !capturedImage ? 'block' : 'none' }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {capturedImage && (
                  <div className="relative w-full h-full">
                    <img src={capturedImage} alt="Captured frame for AR measurement analysis" className="w-full h-full object-cover" />
                    {/* AR Overlay */}
                    {measurement.width !== null && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* AR measurement lines */}
                        <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-accent/80" style={{ transform: 'translateY(-50%)' }}>
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/70 text-accent text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                            W: {displayValue(measurement.width)}
                          </div>
                        </div>
                        <div className="absolute top-8 bottom-8 left-1/2 w-0.5 bg-info/80" style={{ transform: 'translateX(-50%)' }}>
                          <div className="absolute top-1/2 -translate-y-1/2 left-3 bg-black/70 text-info text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                            H: {displayValue(measurement.height)}
                          </div>
                        </div>
                        {/* Corner markers */}
                        {[['top-6 left-6', 'border-t-2 border-l-2'], ['top-6 right-6', 'border-t-2 border-r-2'], ['bottom-6 left-6', 'border-b-2 border-l-2'], ['bottom-6 right-6', 'border-b-2 border-r-2']].map(([pos, border], i) => (
                          <div key={i} className={`absolute ${pos} w-6 h-6 border-accent/80 ${border}`} />
                        ))}
                        {/* Status badge */}
                        <div className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${measurementStatus === 'within_tolerance' ? 'bg-success text-white' : measurementStatus === 'out_of_tolerance' ? 'bg-danger text-white' : 'bg-muted text-foreground'}`}>
                          {measurementStatus === 'within_tolerance' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                          {measurementStatus === 'within_tolerance' ? 'IN TOLERANCE' : measurementStatus === 'out_of_tolerance' ? 'OUT OF TOLERANCE' : 'PENDING'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!cameraActive && !capturedImage && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <Ruler size={32} className="text-accent" />
                    </div>
                    <p className="text-muted-foreground text-sm">Camera not started</p>
                    <button onClick={startCamera} className="btn-primary flex items-center gap-2">
                      <Play size={16} /> Start Camera
                    </button>
                  </div>
                )}

                {cameraActive && !capturedImage && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* AR guide overlay */}
                    <div className="absolute inset-8 border border-dashed border-accent/40 rounded-xl" />
                    {[['top-8 left-8', 'border-t-2 border-l-2'], ['top-8 right-8', 'border-t-2 border-r-2'], ['bottom-8 left-8', 'border-b-2 border-l-2'], ['bottom-8 right-8', 'border-b-2 border-r-2']].map(([pos, border], i) => (
                      <div key={i} className={`absolute ${pos} w-8 h-8 border-accent/60 ${border}`} />
                    ))}
                    <div className="absolute top-4 left-4 bg-black/60 text-accent text-xs font-bold px-2 py-1 rounded">
                      {calibrated ? 'CALIBRATED — READY' : 'ALIGN OBJECT IN FRAME'}
                    </div>
                    {measuring && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 size={32} className="text-accent animate-spin" />
                          <p className="text-white text-sm font-semibold">Measuring dimensions...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="p-4 flex flex-wrap gap-2">
                {!cameraActive ? (
                  <button onClick={startCamera} className="btn-primary flex items-center gap-2">
                    <Play size={15} /> Start Camera
                  </button>
                ) : (
                  <>
                    {!calibrated ? (
                      <button onClick={calibrate} disabled={calibrating} className="btn-primary flex items-center gap-2">
                        {calibrating ? <Loader2 size={15} className="animate-spin" /> : <Target size={15} />}
                        {calibrating ? 'Calibrating...' : 'Calibrate'}
                      </button>
                    ) : (
                      <>
                        {!capturedImage ? (
                          <button onClick={startMeasurement} disabled={measuring} className="btn-primary flex items-center gap-2">
                            {measuring ? <Loader2 size={15} className="animate-spin" /> : <Ruler size={15} />}
                            {measuring ? 'Measuring...' : 'Start Measurement'}
                          </button>
                        ) : (
                          <button onClick={retake} className="btn-secondary flex items-center gap-2">
                            <RotateCcw size={15} /> Retake
                          </button>
                        )}
                      </>
                    )}
                    <button onClick={stopCamera} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-muted-foreground border border-border text-sm font-semibold hover:text-foreground transition-all">
                      <X size={15} /> Stop Camera
                    </button>
                  </>
                )}

                {measurement.width !== null && !saved && (
                  <button onClick={saveMeasurement} disabled={saving} className="btn-primary flex items-center gap-2 ml-auto">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {saving ? 'Saving...' : 'Save Measurement'}
                  </button>
                )}
                {saved && (
                  <div className="ml-auto flex items-center gap-2 text-success text-sm font-semibold">
                    <CheckCircle2 size={15} /> Saved
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {measurement.width !== null && (
              <div className="card-dark rounded-3xl border border-border p-4">
                <label className="block text-sm font-medium text-foreground mb-2">Measurement Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-dark w-full resize-none text-sm"
                  rows={2}
                  placeholder="Add notes about this measurement..."
                />
              </div>
            )}
          </div>

          {/* Measurement Results Panel */}
          <div className="space-y-4">
            {/* Blueprint Settings */}
            <div className="card-dark rounded-3xl border border-border p-5">
              <button
                type="button"
                onClick={() => setShowBlueprint(!showBlueprint)}
                className="w-full flex items-center justify-between mb-3"
              >
                <h3 className="text-base font-semibold text-foreground">Blueprint Specs</h3>
                {showBlueprint ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </button>
              {showBlueprint && (
                <div className="space-y-3">
                  {(['width', 'height', 'depth'] as const).map((dim) => (
                    <div key={dim}>
                      <label className="block text-xs text-muted-foreground mb-1 capitalize">{dim} (cm)</label>
                      <input
                        type="number"
                        value={blueprint[dim]}
                        onChange={(e) => setBlueprint((b) => ({ ...b, [dim]: Number(e.target.value) }))}
                        className="input-dark w-full text-sm"
                        min={1}
                        step={0.5}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Measurement Results */}
            <div className="card-dark rounded-3xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Ruler size={16} className="text-accent" /> Measurements
              </h3>

              {measurement.width === null ? (
                <p className="text-sm text-muted-foreground text-center py-4">Start measurement to see results</p>
              ) : (
                <div className="space-y-3">
                  {/* Overall Status */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">QA Status</span>
                    <StatusBadge
                      variant={measurementStatus === 'within_tolerance' ? 'ok' : measurementStatus === 'out_of_tolerance' ? 'danger' : 'neutral'}
                      label={measurementStatus === 'within_tolerance' ? 'PASS' : measurementStatus === 'out_of_tolerance' ? 'FAIL' : 'PENDING'}
                    />
                  </div>

                  {/* Dimension Comparison */}
                  {(['width', 'height', 'depth'] as const).map((dim) => {
                    const actual = measurement[dim];
                    const expected = blueprint[dim];
                    const v = variance[dim];
                    const isOut = v !== null && Math.abs(v) > tolerance;
                    return (
                      <div key={dim} className={`rounded-xl border p-3 ${isOut ? 'border-danger/30 bg-danger/5' : 'border-border bg-muted/20'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase">{dim}</span>
                          {isOut && <AlertTriangle size={12} className="text-danger" />}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Expected</p>
                            <p className="font-bold text-foreground">{expected}cm</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Actual</p>
                            <p className="font-bold text-foreground">{displayValue(actual)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Variance</p>
                            <p className={`font-bold ${varianceColor(v)}`}>{varianceLabel(v)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="text-xs text-muted-foreground text-center pt-1">
                    Tolerance: ±{tolerance}cm
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {measurementStatus === 'out_of_tolerance' && (
              <div className="card-dark rounded-3xl border border-danger/30 bg-danger/5 p-5">
                <h3 className="text-sm font-semibold text-danger mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} /> Out of Tolerance
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  One or more dimensions exceed the ±{tolerance}cm tolerance. QA auto-failed.
                </p>
                <button
                  onClick={saveMeasurement}
                  disabled={saving || saved}
                  className="w-full btn-primary flex items-center justify-center gap-2 text-sm"
                >
                  <Save size={14} /> Save & Flag for Rework
                </button>
              </div>
            )}
            {measurementStatus === 'within_tolerance' && (
              <div className="card-dark rounded-3xl border border-success/30 bg-success/5 p-5">
                <h3 className="text-sm font-semibold text-success mb-3 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Within Tolerance
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  All dimensions within ±{tolerance}cm tolerance. QA approved.
                </p>
                <button
                  onClick={saveMeasurement}
                  disabled={saving || saved}
                  className="w-full btn-primary flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle2 size={14} /> Approve & Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Measurement History */}
        {showHistory && (
          <div className="card-dark rounded-3xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Measurement History</h3>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-accent" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No measurement history yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Stage</th>
                      <th className="px-4 py-3">W × H × D</th>
                      <th className="px-4 py-3">Tolerance</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(m.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-foreground font-medium">
                          {m.orders?.order_ref || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground capitalize">
                          {m.stage_name?.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {m.width_cm ?? '—'} × {m.height_cm ?? '—'} × {m.depth_cm ?? '—'} cm
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">±{m.tolerance_cm}cm</td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            variant={m.measurement_status === 'within_tolerance' ? 'ok' : m.measurement_status === 'out_of_tolerance' ? 'danger' : 'neutral'}
                            label={m.measurement_status === 'within_tolerance' ? 'PASS' : m.measurement_status === 'out_of_tolerance' ? 'FAIL' : 'PENDING'}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
