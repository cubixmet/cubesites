import { useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Images, LayoutGrid, ListOrdered, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { mediaQueries, mediaService } from "@/services/media";
import { siteQueries } from "@/services/sites";
import { staffQueries } from "@/services/staff";
import { can } from "@/services/core";
import { formatDate, todayISO } from "@/lib/format";
import type { Attachment } from "@/types";
import { DateRangeFilter, EmptyState, type DateRange } from "./common";

export function PhotoGallery({
  siteId,
  showSite,
  allowUpload = true,
}: {
  siteId?: string;
  showSite?: boolean;
  allowUpload?: boolean;
}) {
  const db = useDb();
  const user = useCurrentUser();
  const [range, setRange] = useState<DateRange>({ key: "all" });
  const [view, setView] = useState<"timeline" | "grid">("timeline");
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [del, setDel] = useState<Attachment | null>(null);
  const [upOpen, setUpOpen] = useState(false);
  const photos = mediaQueries.list(db, { siteId, kind: "photo", from: range.from, to: range.to });
  const groups = useMemo(() => {
    const m = new Map<string, Attachment[]>();
    photos.forEach((p) => m.set(p.date, [...(m.get(p.date) ?? []), p]));
    return [...m];
  }, [photos]);
  const canUpload = can(user, "uploadMedia") && !!siteId && allowUpload;

  const Tile = ({ p }: { p: Attachment }) => (
    <button
      type="button"
      onClick={() => setPreview(p)}
      className="group overflow-hidden rounded-lg border bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img
        src={p.src}
        alt={p.caption ?? p.name}
        className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]"
        loading="lazy"
      />
      <div className="px-2 py-1.5">
        <p className="truncate text-xs font-medium">{p.caption ?? "Untitled"}</p>
        {showSite && (
          <p className="truncate text-[11px] text-muted-foreground">
            {siteQueries.get(db, p.siteId)?.name}
          </p>
        )}
      </div>
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <DateRangeFilter value={range} onChange={setRange} />
        <div className="flex rounded-lg border p-0.5">
          <Button
            size="sm"
            variant={view === "timeline" ? "soft" : "ghost"}
            onClick={() => setView("timeline")}
            aria-pressed={view === "timeline"}
          >
            <ListOrdered /> Timeline
          </Button>
          <Button
            size="sm"
            variant={view === "grid" ? "soft" : "ghost"}
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
          >
            <LayoutGrid /> Gallery
          </Button>
        </div>
        {canUpload && (
          <Button className="ml-auto" onClick={() => setUpOpen(true)}>
            <ImagePlus /> Upload photos
          </Button>
        )}
      </div>
      {photos.length === 0 ? (
        <EmptyState
          icon={<Images className="size-5" />}
          title="No progress photos"
          body={
            siteId
              ? "Upload photos to build a timeline of construction progress."
              : "Open a site to upload progress photos."
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <Tile key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <ol className="relative space-y-6 border-l-2 border-accent pl-5">
          {groups.map(([date, ps]) => (
            <li key={date}>
              <span className="absolute -left-[7px] mt-1 size-3 rounded-full bg-primary" />
              <p className="mb-2 text-sm font-semibold">{formatDate(date)}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {ps.map((p) => (
                  <Tile key={p.id} p={p} />
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.caption ?? preview.name}</DialogTitle>
              </DialogHeader>
              <img
                src={preview.src}
                alt={preview.caption ?? preview.name}
                className="max-h-[60vh] w-full rounded-lg object-contain"
              />
              <p className="text-sm text-muted-foreground">
                {formatDate(preview.date)} · {siteQueries.get(db, preview.siteId)?.name} · by{" "}
                {staffQueries.name(db, preview.createdBy)}
              </p>
              {can(user, "uploadMedia") && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => {
                      setDel(preview);
                      setPreview(null);
                    }}
                  >
                    <Trash2 /> Remove photo
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. The removal is recorded in the activity log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await mediaService.remove(del!.id);
                toast.success("Photo removed");
                setDel(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {siteId && <UploadPhotosDialog siteId={siteId} open={upOpen} onOpenChange={setUpOpen} />}
    </div>
  );
}

function UploadPhotosDialog({
  siteId,
  open,
  onOpenChange,
}: {
  siteId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [date, setDate] = useState(todayISO());
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const cam = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => ({ f, url: URL.createObjectURL(f) })), [files]);

  const upload = async () => {
    setBusy(true);
    let ok = 0;
    for (const f of files) {
      try {
        await mediaService.upload(f, { siteId, kind: "photo", date, caption }, (p) =>
          setProgress((x) => ({ ...x, [f.name]: p })),
        );
        ok++;
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
    setBusy(false);
    if (ok) toast.success(`${ok} photo${ok > 1 ? "s" : ""} saved (demo storage)`);
    setFiles([]);
    setCaption("");
    setProgress({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload progress photos</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => ref.current?.click()}>
            <ImagePlus /> Choose
          </Button>
          <Button variant="outline" onClick={() => cam.current?.click()}>
            <Camera /> Camera
          </Button>
          <input
            ref={ref}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              setFiles((x) => [...x, ...Array.from(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
          <input
            ref={cam}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              setFiles((x) => [...x, ...Array.from(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </div>
        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map(({ f, url }, i) => (
              <div key={i} className="relative">
                <img
                  src={url}
                  alt={f.name}
                  className="aspect-square w-full rounded-lg object-cover"
                />
                {progress[f.name] != null ? (
                  <Progress value={progress[f.name]} className="mt-1 h-1.5" />
                ) : (
                  !busy && (
                    <button
                      type="button"
                      onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 rounded-full bg-background/90 px-2 text-xs shadow"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pd">Date</Label>
            <Input
              id="pd"
              type="date"
              max={todayISO()}
              className="mt-1.5"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="pc">Caption</Label>
            <Input
              id="pc"
              className="mt-1.5"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Optional"
              maxLength={80}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Demo: photos are stored in this browser only — no real upload happens.
        </p>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!files.length || busy} onClick={upload}>
            {busy && <Loader2 className="animate-spin" />}Upload {files.length || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
