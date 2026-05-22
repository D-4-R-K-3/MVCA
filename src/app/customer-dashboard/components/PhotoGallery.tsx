'use client';
import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ChevronLeft, ChevronRight, Shield, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Photo {
  id: string;
  image_url: string;
  caption: string;
  tags: string[];
  stage_name: string;
  created_at: string;
}

interface PhotoGalleryProps {
  orderId?: string;
}

export default function PhotoGallery({ orderId }: PhotoGalleryProps) {
  const supabase = createClient();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState('All');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);
      let query = supabase.from('inspection_images').select('*').order('created_at', { ascending: false });
      if (orderId) query = query.eq('order_id', orderId);
      const { data } = await query;
      if (data) {
        setPhotos(data.map((p: any) => ({
          id: p.id,
          image_url: p.image_url,
          caption: p.caption || '',
          tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? JSON.parse(p.tags) : []),
          stage_name: p.stage_name || '',
          created_at: p.created_at,
        })));
      }
      setLoading(false);
    };
    fetchPhotos();
  }, [orderId, supabase]);

  const allTags = ['All', ...Array.from(new Set(photos.flatMap((p) => p.tags)))];
  const filtered = activeTag === 'All' ? photos : photos.filter((p) => p.tags.includes(activeTag));
  const lightboxPhoto = lightboxIdx !== null ? filtered[lightboxIdx] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-purple-600 dark:text-purple-300" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="card-dark rounded-2xl border border-border py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">No inspection photos yet</p>
        <p className="mt-1 text-xs text-muted-foreground/80">Photos will appear here as your order progresses through production stages</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Inspection Photos</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{photos.length} photos</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
              <Shield size={12} /> MVCA Certified
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                activeTag === tag
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map((photo, idx) => (
          <div
            key={photo.id}
            className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-transform duration-200 hover:-translate-y-0.5"
            onClick={() => setLightboxIdx(idx)}
          >
            <img src={photo.image_url} alt={photo.caption || `Inspection photo from ${photo.stage_name} stage`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
              <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex flex-wrap gap-1 mb-1">
                {photo.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">{tag}</span>
                ))}
              </div>
              <p className="text-2xs text-white/80 capitalize">{photo.stage_name?.replace('_', ' ')} · {new Date(photo.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>

      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setLightboxIdx(null)}>
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-video">
              <img src={lightboxPhoto.image_url} alt={lightboxPhoto.caption || 'Inspection photo'} className="w-full h-full object-cover" />
              <button onClick={() => setLightboxIdx((i) => i !== null ? (i - 1 + filtered.length) % filtered.length : 0)} className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-card text-foreground shadow" title="Previous photo" aria-label="Previous photo">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setLightboxIdx((i) => i !== null ? (i + 1) % filtered.length : 0)} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-card text-foreground shadow" title="Next photo" aria-label="Next photo">
                <ChevronRight size={18} />
              </button>
              <button onClick={() => setLightboxIdx(null)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white" title="Close photo viewer" aria-label="Close photo viewer">
                <X size={15} />
              </button>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {lightboxPhoto.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{tag}</span>
                ))}
              </div>
              <p className="text-sm font-medium text-foreground">{lightboxPhoto.caption}</p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">{lightboxPhoto.stage_name?.replace('_', ' ')} · {new Date(lightboxPhoto.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}