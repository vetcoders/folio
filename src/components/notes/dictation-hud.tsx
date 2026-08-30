import { cn } from "@/lib/cn";
import type { DictationSnapshot } from "@/lib/codescribe/session";
import { clock } from "@/lib/format-time";

function engineLabel(snap: DictationSnapshot): string {
  if (snap.engine === "gap-fill" || !snap.liveAvailable) return "gap-fill · xAI STT";
  return "web-speech · Folio";
}

export function DictationHud({
  snap,
  onStop,
  onCancel,
}: {
  snap: DictationSnapshot;
  onStop: () => void;
  onCancel: () => void;
}) {
  if (snap.status === "idle") return null;
  const listening = snap.status === "listening";
  const sealing = snap.status === "sealing";
  const tag =
    snap.status === "requesting"
      ? "ARMING"
      : snap.status === "error"
        ? "ERROR"
        : sealing
          ? "STOP"
          : "RECORDING";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-10 z-30 flex justify-center px-3">
      <div
        className={cn(
          "cs-overlay pointer-events-auto w-full max-w-[28rem] overflow-hidden",
          "rounded-[22px] shadow-[var(--shadow-float)]",
        )}
        role="dialog"
        aria-label="Folio dictation overlay"
      >
        <header className="flex items-center gap-3 px-5 py-3">
          <button
            type="button"
            aria-label="Zamknij overlay"
            onClick={onCancel}
            className="relative size-4 shrink-0"
          >
            <span className="absolute left-1/2 top-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--cs-terra)]" />
          </button>
          <p className="text-[15px] font-semibold tracking-tight text-[var(--cs-high)]">
            folio
          </p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
              listening
                ? "bg-[var(--cs-terra)]/15 text-[var(--cs-terra)]"
                : "bg-white/5 text-[var(--cs-muted)]",
            )}
          >
            {listening ? "live" : sealing ? "seal" : snap.status}
          </span>
          <span className="ml-auto font-mono text-[11px] tabular-nums text-[var(--cs-faint)]">
            {clock(snap.elapsedMs / 1000)}
          </span>
        </header>

        <div className="h-px bg-white/[0.06]" />

        <div className="flex items-center gap-2.5 px-5 py-2">
          <span className="rounded-md border border-[var(--cs-terra)]/30 bg-[var(--cs-terra)]/10 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-[var(--cs-terra)]">
            {tag}
          </span>
          <span className="font-mono text-[11px] text-[var(--cs-faint)]">
            {snap.sessionId ?? "—"}
            {snap.sealedCount ? ` · ${snap.sealedCount} sealed` : ""}
          </span>
        </div>

        <div className="px-5 pb-2 pt-1">
          <div className="flex h-8 items-end gap-px" aria-hidden>
            {snap.bins.map((v, i) => (
              <span
                key={i}
                className="flex-1 rounded-[1px]"
                style={{
                  height: `${Math.max(8, v * 100)}%`,
                  background:
                    i % 5 === 4
                      ? "var(--cs-terra-bar)"
                      : listening
                        ? "color-mix(in oklab, var(--cs-terra) 70%, white)"
                        : "rgba(255,255,255,0.18)",
                  opacity: 0.45 + v * 0.55,
                }}
              />
            ))}
          </div>
        </div>

        <div className="min-h-[5.5rem] px-5 pb-3">
          {snap.error ? (
            <p className="text-sm leading-relaxed text-[var(--cs-terra)]">{snap.error}</p>
          ) : (
            <p className="text-[17px] font-medium leading-relaxed text-[var(--cs-high)]">
              {snap.committed ? <span>{snap.committed} </span> : null}
              {snap.partial ? (
                <span className="text-[var(--cs-muted)]">{snap.partial}</span>
              ) : listening && !snap.committed ? (
                <span className="text-[var(--cs-faint)]">Mów.</span>
              ) : null}
              {listening ? <span className="cs-caret" aria-hidden /> : null}
            </p>
          )}
        </div>

        <div className="h-px bg-white/[0.06]" />

        <div className="flex items-center gap-2 px-5 py-2">
          {listening || snap.status === "requesting" ? (
            <button
              type="button"
              onClick={onStop}
              className="rounded-[10px] bg-white/[0.04] px-3 py-1.5 text-[12px] font-semibold text-[var(--cs-body)] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
            >
              Finish
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[10px] bg-[var(--cs-danger)] px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            Close
          </button>
          <span className="ml-auto font-mono text-[10px] text-[var(--cs-faint)]">
            <span className="mr-1.5 text-[var(--cs-olive)]">●</span>
            {engineLabel(snap)}
          </span>
        </div>
      </div>
    </div>
  );
}
