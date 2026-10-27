import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mediaService } from "@/services/media";
import type { Attachment, AttachmentKind } from "@/types";
import { formatBytes } from "@/lib/format";

interface Pending { key: string; name: string; progress: number; error?: string }

/** Uploads through the mock file service; nothing leaves the device. */
export function AttachmentPicker({ siteId, date, kind = "bill", value, onChange, existing = [] }: { siteId: string; date: string; kind?: AttachmentKind; value: Attachment[]; onChange: (a: Attachment[]) => void; existing?: Attachment[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const all = [...existing, ...value];

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!siteId) { setPending([{ key: "x", name: "Select a site first", progress: 0, error: "Choose a site before attaching bills." }]); return; }
    const list = Array.from(files);
    const results: Attachment[] = [];
    await Promise.all(list.map(async (f, idx) => {
      const key = `${Date.now()}_${idx}`;
      setPending((p) => [...p, { key, name: f.name, progress: 0 }]);
      try {
        const a = await mediaService.upload(f, { siteId, kind, date }, (pr) => setPending((p) => p.map((x) => (x.key === key ? { ...x, progress: pr } : x))));
        results.push(a);
        setPending((p) => p.filter((x) => x.key !== key));
      } catch (e) {
        setPending((p) => p.map((x) => (x.key === key ? { ...x, error: (e as Error).message } : x)));
      }
    }));
    if (results.length) onChange([...value, ...results]);
  };

  const remove = async (a: Attachment) => {
    await mediaService.remove(a.id);
    onChange(value.filter((x) => x.id !== a.id));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}><ImagePlus /> Choose images</Button>
        <Button type="button" variant="outline" onClick={() => camRef.current?.click()}><Camera /> Take photo</Button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { handle(e.target.files); e.target.value = ""; }} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { handle(e.target.files); e.target.value = ""; }} />
      </div>
      <p className="text-xs text-muted-foreground">Demo: images are compressed and kept in this browser only — not uploaded to a server.</p>
      {pending.map((p) => (
        <div key={p.key} className="rounded-lg border p-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 truncate">{p.error ? <AlertCircle className="size-4 text-destructive" /> : <Loader2 className="size-4 animate-spin" />}{p.name}</span>
            {p.error && <button type="button" className="text-xs underline" onClick={() => setPending((x) => x.filter((y) => y.key !== p.key))}>Dismiss</button>}
          </div>
          {p.error ? <p className="mt-1 text-xs text-destructive">{p.error}</p> : <Progress value={p.progress} className="mt-2 h-1.5" />}
        </div>
      ))}
      {all.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {all.map((a) => (
            <div key={a.id} className="group relative overflow-hidden rounded-lg border bg-muted">
              <a href={a.src} target="_blank" rel="noreferrer"><img src={a.src} alt={a.name} className="aspect-square w-full object-cover" /></a>
              <div className="truncate px-1.5 py-1 text-[11px] text-muted-foreground">{formatBytes(a.sizeBytes)}</div>
              {value.some((v) => v.id === a.id) && (
                <button type="button" aria-label={`Remove ${a.name}`} onClick={() => remove(a)} className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow"><X className="size-4" /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
