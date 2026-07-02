"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WindowFrame from "@/components/ui/WindowFrame";
import PixelButton from "@/components/ui/PixelButton";
import Tag from "@/components/ui/Tag";
import {
  PROVIDERS,
  DEFAULT_PROVIDER_ID,
  recommendedFor,
} from "@/lib/constants";
import { detectLinks, type DetectedLink } from "@/lib/linkDetect";
import { parseLabFiles, type LabFile } from "@/lib/labFiles";
import { buildZip, downloadBlob } from "@/lib/zip";
import type { ChatMessage, ChatUsage, ModelInfo } from "@/lib/venice";

type Phase = "upload" | "research" | "contracts" | "review";

const PHASES: { id: Phase; n: string; label: string }[] = [
  { id: "upload", n: "01", label: "Upload" },
  { id: "research", n: "02", label: "Deep research" },
  { id: "contracts", n: "03", label: "Download .sol" },
];

const KEY_STORAGE = "eiplab_provider_keys";
// The deep-research phase is capped at a handful of exchanges. The user can
// jump to contracts anytime via the "generate contracts" button (agreement /
// explicit request); this is just the upper bound if they keep iterating.
const MAX_RESEARCH_TURNS = 7;

export default function LabApp() {
  const [providerId, setProviderId] = useState(DEFAULT_PROVIDER_ID);
  const provider = PROVIDERS.find((p) => p.id === providerId) ?? PROVIDERS[0];

  const [apiKey, setApiKey] = useState("");
  const [rememberKey, setRememberKey] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState("");
  const [modelsLoading, setModelsLoading] = useState(false);
  const [stripThinking, setStripThinking] = useState(true);

  const selectedModel = models.find((m) => m.id === model);

  const [eipText, setEipText] = useState("");
  const [fetchedContext, setFetchedContext] = useState<Record<string, string>>(
    {},
  );

  const [phase, setPhase] = useState<Phase>("upload");
  const [researchTurns, setResearchTurns] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Non-fatal context-trim notice (large EIP / docs trimmed to fit).
  const [notice, setNotice] = useState<string | null>(null);

  const [tokens, setTokens] = useState({
    prompt: 0,
    completion: 0,
    total: 0,
    cached: 0,
  });
  const [costUsd, setCostUsd] = useState(0);
  const [files, setFiles] = useState<LabFile[]>([]);
  const [contractsRaw, setContractsRaw] = useState("");
  const [truncated, setTruncated] = useState(false);
  // Live progress for the current turn: elapsed seconds, whether the
  // model is still in its (silent) reasoning phase, and a short preview
  // of the reasoning so "working" is visibly distinct from "stuck".
  const [live, setLive] = useState<{
    seconds: number;
    reasoning: boolean;
    preview: string;
  } | null>(null);

  const transcriptRef = useRef<HTMLDivElement>(null);

  // Restore remembered key on mount / provider switch, and reset the
  // model picker — model ids are provider-specific, so a stale Venice
  // slug must not linger when the user flips to OpenAI.
  useEffect(() => {
    setModels([]);
    setModel("");
    try {
      const raw = localStorage.getItem(KEY_STORAGE);
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      if (map[providerId]) {
        setApiKey(map[providerId]);
        setRememberKey(true);
      } else {
        setApiKey("");
        setRememberKey(false);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  // Persist (or clear) the key when rememberKey toggles.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY_STORAGE);
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      if (rememberKey && apiKey) {
        map[providerId] = apiKey;
      } else {
        delete map[providerId];
      }
      localStorage.setItem(KEY_STORAGE, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  }, [rememberKey, apiKey, providerId]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages, busy]);

  const links = useMemo<DetectedLink[]>(() => detectLinks(eipText), [eipText]);

  const eipContext = useMemo(() => {
    const fetched = Object.entries(fetchedContext)
      .map(([url, text]) => `# Fetched from ${url}\n\n${text}`)
      .join("\n\n");
    return [eipText.trim(), fetched].filter(Boolean).join("\n\n");
  }, [eipText, fetchedContext]);

  // ── actions ────────────────────────────────────────────────────────

  async function loadModels() {
    setError(null);
    if (!apiKey || apiKey.length < 8) {
      setError("Enter your API key first.");
      return;
    }
    setModelsLoading(true);
    try {
      const res = await fetch("/api/venice/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, apiKey }),
      });
      const json = await res.json();
      const list: ModelInfo[] = json.models ?? [];
      // Offer only the curated best-fit models that this key can access,
      // in recommended (best-first) order. Merge live capability/pricing
      // (Venice's model_spec) with the static catalog (OpenAI's /models is
      // id-only, so pricing/caps come from the catalog). If the API
      // returned a non-empty list, keep only curated models present in it
      // (availability); otherwise show the whole curated catalog.
      const recs = recommendedFor(providerId);
      const curated = recs
        .map((r) => {
          const apiM = list.find((m) => m.id === r.id);
          if (list.length && !apiM) return null; // not accessible by this key
          return {
            id: r.id,
            contextTokens: apiM?.contextTokens ?? r.contextTokens,
            maxCompletionTokens:
              apiM?.maxCompletionTokens ?? r.maxCompletionTokens,
            optimizedForCode: apiM?.optimizedForCode ?? r.optimizedForCode,
            supportsReasoning: apiM?.supportsReasoning ?? r.supportsReasoning,
            inputUsdPerMtok: apiM?.inputUsdPerMtok ?? r.inputUsdPerMtok,
            cachedInputUsdPerMtok:
              apiM?.cachedInputUsdPerMtok ?? r.cachedInputUsdPerMtok,
            outputUsdPerMtok: apiM?.outputUsdPerMtok ?? r.outputUsdPerMtok,
          } as ModelInfo;
        })
        .filter(Boolean) as ModelInfo[];
      const finalList = curated.length ? curated : list;
      setModels(finalList);
      if (finalList.length) setModel(finalList[0].id);
      if (json.warning) setError(`Note: ${json.warning}`);
    } catch {
      const fb = provider.fallbackModels.map((id) => ({ id }) as ModelInfo);
      setModels(fb);
      if (fb.length) setModel(fb[0].id);
    } finally {
      setModelsLoading(false);
    }
  }

  function onUploadFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    // Only accept plain-text / markdown EIP files.
    const okType =
      file.type === "" ||
      file.type.startsWith("text/") ||
      /\.(md|markdown|txt)$/i.test(file.name);
    if (!okType) {
      setError("Upload a .md or .txt file (plain text).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setEipText((prev) =>
        prev.trim()
          ? `${prev.trim()}\n\n# ${file.name}\n\n${text}`
          : text,
      );
    };
    reader.onerror = () => setError(`Could not read ${file.name}.`);
    reader.readAsText(file);
  }

  async function fetchLink(url: string) {
    setError(null);
    try {
      const res = await fetch("/api/eip/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        return;
      }
      setFetchedContext((prev) => ({ ...prev, [url]: json.text ?? "" }));
    } catch {
      setError(`Could not fetch ${url} — paste the content manually.`);
    }
  }

  /**
   * Launch: auto-fetch every fetchable link, assemble the real EIP
   * context, refuse to proceed if there's no actual spec content (so
   * the model can't hallucinate from a bare URL), then start phase 2.
   */
  async function launch() {
    setError(null);
    if (!model) {
      setError("Pick a model first.");
      return;
    }

    setBusy(true);
    // Fetch any allowlisted links not already fetched.
    const fetched: Record<string, string> = { ...fetchedContext };
    for (const l of links) {
      if (l.kind === "other" || fetched[l.url]) continue;
      try {
        const res = await fetch("/api/eip/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: l.url }),
        });
        const json = await res.json();
        if (json.text) fetched[l.url] = json.text;
      } catch {
        /* leave it; we validate content below */
      }
    }
    setFetchedContext(fetched);

    // Assemble context locally (state updates are async).
    const fetchedStr = Object.entries(fetched)
      .map(([url, text]) => `# Fetched from ${url}\n\n${text}`)
      .join("\n\n");
    const ctx = [eipText.trim(), fetchedStr].filter(Boolean).join("\n\n");

    // Block only near-empty / bare-URL input (which caused the model to
    // hallucinate an EIP from its number before). A short but real draft
    // IS allowed through — the research phase can help draft/sharpen a
    // rough or experimental proposal, so we keep this floor low.
    const contentLen = ctx.replace(/https?:\/\/\S+/g, "").trim().length;
    if (contentLen < 80) {
      setBusy(false);
      setError(
        "Almost nothing to research yet. Paste the EIP text (a rough or " +
          "experimental draft is fine — the Lab can help sharpen it), upload " +
          "a .md/.txt, or use a fetchable link (eips.ethereum.org / raw " +
          "github / ethereum-magicians / ethresear.ch). I won't guess an EIP " +
          "from a bare URL alone.",
      );
      return;
    }

    // busy is already true; send() will keep it managed.
    setBusy(false);
    setResearchTurns(1);
    await send(
      "research",
      "Here is the EIP. Do deep research on it and on the EVVM stack reference you have, confirm what it is, and ask me up to 5 focused questions so we can converge on the best happy path to test this EIP on the EVVM stack (including which core contracts would change).",
      { contextOverride: ctx },
    );
  }

  async function send(
    toPhase: Phase,
    userContent: string,
    opts?: { append?: boolean; contextOverride?: string },
  ) {
    if (!model) {
      setError("Pick a model first.");
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    // "review" is a sub-step of phase 4 — keep the visible stepper on
    // contracts so the progress UI doesn't break.
    if (toPhase !== "review") setPhase(toPhase);

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userContent },
    ];
    setMessages(nextMessages);

    // Resilient streaming consumer. A mid-stream connection drop (a
    // network blip, or the provider/host killing a long-lived stream)
    // used to lose the whole turn. Now: retry transient early drops,
    // keep partial output on later drops, hard-timeout hung streams.
    const MAX_ATTEMPTS = 3;
    const KEEP_PARTIAL_CHARS = 400; // drop after this much = keep, don't retry
    const IDLE_TIMEOUT_MS = 45_000; // no token for this long = stalled stream
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Live elapsed-time ticker so a long silent reasoning window reads as
    // "working… 47s" rather than a frozen "thinking…".
    const startedAt = Date.now();
    setLive({ seconds: 0, reasoning: false, preview: "" });
    const ticker = setInterval(() => {
      setLive((l) =>
        l ? { ...l, seconds: Math.round((Date.now() - startedAt) / 1000) } : l,
      );
    }, 1000);

    let acc = "";
    let usage: ChatUsage | null = null;
    let finishReason: string | null = null;
    let softError: string | null = null;
    let lastPaint = 0;
    const paint = (force = false) => {
      const now = Date.now();
      if (force || now - lastPaint > 60) {
        lastPaint = now;
        setMessages([...nextMessages, { role: "assistant", content: acc }]);
      }
    };

    const body = JSON.stringify({
      providerId,
      apiKey,
      model,
      phase: toPhase,
      messages: nextMessages,
      eipContext: opts?.contextOverride ?? eipContext,
      maxCompletionTokens: selectedModel?.maxCompletionTokens,
      contextTokens: selectedModel?.contextTokens,
      stripThinking,
    });

    try {
      let attempt = 0;
      let settled = false;

      while (attempt < MAX_ATTEMPTS && !settled) {
        attempt++;
        // Fresh accumulation each attempt; a retry repaints from scratch.
        acc = "";
        usage = null;
        finishReason = null;
        softError = null;

        // Idle watchdog: abort if no token arrives for IDLE_TIMEOUT_MS.
        // This catches a stream that goes quiet without erroring (the
        // "stuck on thinking…" case) as well as a hard drop.
        const controller = new AbortController();
        let idleTimer: ReturnType<typeof setTimeout> | null = null;
        const armIdle = () => {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => controller.abort(), IDLE_TIMEOUT_MS);
        };
        const clearIdle = () => {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = null;
        };
        let dropped = false;

        try {
          armIdle(); // start the clock for the first byte
          const res = await fetch("/api/lab/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            signal: controller.signal,
          });

          if (res.status === 429) {
            clearIdle();
            setError("Rate limited by the provider — wait a few seconds and retry.");
            return;
          }
          if (!res.ok || !res.body) {
            clearIdle();
            const t = await res.text().catch(() => "");
            if (attempt < MAX_ATTEMPTS) {
              setError(`server error ${res.status} — retrying (${attempt}/${MAX_ATTEMPTS})…`);
              await sleep(600 * attempt);
              continue;
            }
            setError(`Request failed (${res.status}). ${t.slice(0, 140)}`);
            return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              armIdle(); // got bytes — reset the idle watchdog
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() ?? "";
              for (const line of lines) {
                if (!line.trim()) continue;
                let ev: {
                  delta?: string;
                  reasoning?: string;
                  heartbeat?: number;
                  notice?: string;
                  usage?: ChatUsage | null;
                  finishReason?: string | null;
                  truncated?: boolean;
                  error?: string;
                };
                try {
                  ev = JSON.parse(line);
                } catch {
                  continue;
                }
                if (ev.error) {
                  softError = ev.error;
                  continue;
                }
                if (ev.notice) {
                  setNotice(ev.notice);
                  continue;
                }
                if (ev.reasoning) {
                  // Reasoning is progress, not answer — never added to acc.
                  const chunk = ev.reasoning;
                  setLive((l) => ({
                    seconds: l?.seconds ?? 0,
                    reasoning: true,
                    preview: ((l?.preview ?? "") + chunk).slice(-160),
                  }));
                  continue;
                }
                if (ev.delta) {
                  acc += ev.delta;
                  // First answer token — reasoning phase is over.
                  setLive((l) => (l ? { ...l, reasoning: false } : l));
                  paint();
                }
                if (ev.usage) usage = ev.usage;
                if (ev.finishReason !== undefined) finishReason = ev.finishReason;
              }
            }
          } catch {
            // Mid-stream connection drop, abort, or idle-timeout.
            dropped = true;
          } finally {
            clearIdle();
          }
          paint(true);

          if (!dropped) {
            settled = true; // completed cleanly (maybe with a soft {error})
          } else if (acc.length >= KEEP_PARTIAL_CHARS) {
            // Substantial output already streamed — keep it, let the
            // user continue/retry the step rather than re-spend tokens.
            softError =
              "Stream interrupted (network) after partial output — kept what arrived. Continue the step, or retry.";
            settled = true;
          } else if (attempt < MAX_ATTEMPTS) {
            setError(`network blip — retrying (${attempt}/${MAX_ATTEMPTS})…`);
            await sleep(600 * attempt);
            continue;
          } else if (acc) {
            softError = "Stream interrupted (network). Continue the step, or retry.";
            settled = true;
          } else {
            setError("Network error — the stream dropped before any output. Retry the step.");
            return;
          }
        } catch (fetchErr) {
          clearIdle();
          // fetch rejected (abort/timeout/offline) before producing a body.
          if (attempt < MAX_ATTEMPTS) {
            setError(`network error — retrying (${attempt}/${MAX_ATTEMPTS})…`);
            await sleep(600 * attempt);
            continue;
          }
          setError(
            fetchErr instanceof Error
              ? `Network error: ${fetchErr.message}. Retry the step.`
              : "Network error. Retry the step.",
          );
          return;
        }
      }

      // ── post-processing (after the attempt loop) ──
      if (softError && !acc) {
        setError(softError);
        return;
      }
      setError(softError); // soft warning kept if partial; null clears on success

      if (usage) {
        const cachedTok = usage.cached_tokens ?? 0;
        setTokens((t) => ({
          prompt: t.prompt + (usage!.prompt_tokens ?? 0),
          completion: t.completion + (usage!.completion_tokens ?? 0),
          total: t.total + (usage!.total_tokens ?? 0),
          cached: t.cached + cachedTok,
        }));
        const inUsd = selectedModel?.inputUsdPerMtok;
        const outUsd = selectedModel?.outputUsdPerMtok;
        // Cached prefix (the ~290k EVVM docs, re-sent each exchange) bills at
        // the model's cached-input rate — ~10% on GPT-5. Fall back to full
        // input price when the provider/model reports no cached rate.
        const cachedUsd = selectedModel?.cachedInputUsdPerMtok ?? inUsd;
        if (inUsd != null && outUsd != null) {
          const promptTok = usage.prompt_tokens ?? 0;
          const uncachedTok = Math.max(0, promptTok - cachedTok);
          const cost =
            (uncachedTok / 1e6) * inUsd +
            (cachedTok / 1e6) * (cachedUsd ?? inUsd) +
            ((usage.completion_tokens ?? 0) / 1e6) * outUsd;
          setCostUsd((c) => c + cost);
        }
      }

      setTruncated(finishReason === "length");

      if (toPhase === "contracts" || toPhase === "review") {
        const raw = (opts?.append ? contractsRaw : "") + acc;
        setContractsRaw(raw);
        setFiles(parseLabFiles(raw));
      }
    } finally {
      clearInterval(ticker);
      setLive(null);
      setBusy(false);
    }
  }

  function downloadAll() {
    if (!files.length) return;
    const entries = files.map((f) => ({
      path: `eip-lab-output/${f.path}`,
      content: f.content,
    }));
    entries.push({
      path: "eip-lab-output/README.md",
      content: readmeFor(),
    });
    downloadBlob(buildZip(entries), "eip-lab-output.zip");
  }

  function readmeFor(): string {
    return `# EVVM EIP Lab — generated output

Generated by EVVM EIP Lab using ${provider.label} (${model}).

This package contains the documented Solidity the Lab produced for your
EIP, plus the justification writeup.

Token usage this session: ${tokens.total} total (${tokens.prompt} prompt + ${tokens.completion} completion).

Files:
${files.map((f) => `- ${f.path}`).join("\n")}

License: EVVM Noncommercial License v1.0
`;
  }

  function reset() {
    setPhase("upload");
    setResearchTurns(0);
    setMessages([]);
    setFiles([]);
    setContractsRaw("");
    setTruncated(false);
    setTokens({ prompt: 0, completion: 0, total: 0, cached: 0 });
    setCostUsd(0);
    setError(null);
    setNotice(null);
  }

  const canStart = apiKey.length >= 8 && model && eipContext.trim().length > 20;

  // ── render ─────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      {/* Phase stepper */}
      <div className="mb-4 flex flex-wrap gap-2">
        {PHASES.map((p, i) => {
          const active = p.id === phase;
          const done = PHASES.findIndex((x) => x.id === phase) > i;
          return (
            <div
              key={p.id}
              className={`pixel-edge flex items-center gap-2 border-2 px-3 py-1.5 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-widest ${
                active
                  ? "border-[var(--color-vp-pink)] text-[var(--color-vp-pink)] glow-pink"
                  : done
                    ? "border-[var(--color-matrix)] text-[var(--color-matrix)]"
                    : "border-[rgba(255,255,255,0.15)] text-[var(--color-text-dim)]"
              }`}
            >
              <span className="font-[family-name:var(--font-press-start)] text-[9px]">
                {p.n}
              </span>
              {p.label}
              {done && <span className="text-[var(--color-matrix)]">✓</span>}
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* LEFT: config + EIP input */}
        <div className="flex flex-col gap-4">
          <WindowFrame title="~/eiplab/provider" accent="cyan">
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="mb-1 block font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
                  provider
                </span>
                <select
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  className="w-full border-2 border-[rgba(255,255,255,0.15)] bg-[#07010f] px-2 py-1.5 font-[family-name:var(--font-mono)] text-[var(--color-text)] focus:border-[var(--color-vp-cyan)] focus:outline-none"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id} disabled={!p.enabled}>
                      {p.label}
                      {p.enabled ? "" : " (soon)"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 flex items-center justify-between font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
                  <span>api key</span>
                  <a
                    href={provider.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--color-vp-cyan)]"
                  >
                    get key ↗
                  </a>
                </span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={providerId === "openai" ? "sk-..." : "vk-..."}
                  className="w-full border-2 border-[rgba(255,255,255,0.15)] bg-[#07010f] px-2 py-1.5 font-[family-name:var(--font-mono)] text-[var(--color-text)] focus:border-[var(--color-vp-cyan)] focus:outline-none"
                />
              </label>

              <label className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={rememberKey}
                  onChange={(e) => setRememberKey(e.target.checked)}
                />
                remember key in this browser only
              </label>

              <p className="font-[family-name:var(--font-mono)] text-[10px] leading-relaxed text-[var(--color-text-dim)]">
                Your key is sent per-request to our proxy, forwarded to{" "}
                {provider.label}, and discarded. Never written to our
                storage. Only token counts are logged (for cost research).
              </p>

              <div className="flex items-center gap-2">
                <PixelButton
                  variant="secondary"
                  size="sm"
                  onClick={loadModels}
                  disabled={modelsLoading}
                >
                  {modelsLoading ? "loading…" : "load models"}
                </PixelButton>
                {models.length > 0 && (
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="flex-1 border-2 border-[rgba(255,255,255,0.15)] bg-[#07010f] px-2 py-1.5 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text)] focus:border-[var(--color-vp-cyan)] focus:outline-none"
                  >
                    {models.map((m, i) => {
                      const rec = recommendedFor(providerId).find(
                        (r) => r.id === m.id,
                      );
                      const prefix =
                        i === 0 ? "★ " : rec?.tier === "premium" ? "◆ " : "";
                      return (
                        <option key={m.id} value={m.id}>
                          {prefix}
                          {m.id}
                          {rec ? `  — ${rec.tier}` : ""}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {selectedModel &&
                (() => {
                  const rec = recommendedFor(providerId).find(
                    (r) => r.id === selectedModel.id,
                  );
                  return rec ? (
                    <p className="font-[family-name:var(--font-mono)] text-[10px] leading-relaxed text-[var(--color-text-muted)]">
                      <span className="text-[var(--color-matrix)]">
                        {rec.tier === "default" ? "★ recommended" : rec.tier}
                      </span>{" "}
                      — {rec.note}
                    </p>
                  ) : null;
                })()}

              {selectedModel && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-text-dim)]">
                  {selectedModel.optimizedForCode && (
                    <span className="text-[var(--color-matrix)]">◆ code</span>
                  )}
                  {selectedModel.supportsReasoning && (
                    <span className="text-[var(--color-vp-purple)]">
                      reasoning
                    </span>
                  )}
                  {selectedModel.contextTokens != null && (
                    <span>
                      ctx {Math.round(selectedModel.contextTokens / 1000)}k
                    </span>
                  )}
                  {selectedModel.inputUsdPerMtok != null &&
                    selectedModel.outputUsdPerMtok != null && (
                      <span className="text-[var(--color-vp-cyan)]">
                        ${selectedModel.inputUsdPerMtok}/$
                        {selectedModel.outputUsdPerMtok} per Mtok
                      </span>
                    )}
                </div>
              )}

              {selectedModel?.maxCompletionTokens != null &&
                selectedModel.maxCompletionTokens < 16000 && (
                  <p className="border-2 border-[var(--color-amber)] bg-[rgba(255,176,0,0.08)] px-2 py-1.5 font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-amber)]">
                    ⚠ {Math.round(selectedModel.maxCompletionTokens / 1000)}k
                    max output — the contracts phase may truncate; you&apos;ll
                    use the &quot;continue&quot; button more.
                  </p>
                )}

              {selectedModel?.supportsReasoning && (
                <label className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">
                  <input
                    type="checkbox"
                    checked={stripThinking}
                    onChange={(e) => setStripThinking(e.target.checked)}
                  />
                  hide the model&apos;s reasoning trace (kept out of files
                  either way)
                </label>
              )}
            </div>
          </WindowFrame>

          <WindowFrame title="~/eiplab/eip-input" accent="pink">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
                  paste the EIP — or upload a file
                </p>
                <label className="cursor-pointer border border-[var(--color-vp-pink)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] uppercase text-[var(--color-vp-pink)] hover:bg-[rgba(255,0,110,0.1)]">
                  ↑ upload .md / .txt
                  <input
                    type="file"
                    accept=".md,.markdown,.txt,text/markdown,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      onUploadFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <textarea
                value={eipText}
                onChange={(e) => setEipText(e.target.value)}
                rows={10}
                placeholder={
                  "Paste the full EIP text, upload a .md/.txt file, or drop links:\n" +
                  "https://eips.ethereum.org/EIPS/eip-XXXX\n" +
                  "https://ethereum-magicians.org/t/...\n" +
                  "https://github.com/your/repo"
                }
                className="w-full resize-y border-2 border-[rgba(255,255,255,0.15)] bg-[#07010f] p-2 font-[family-name:var(--font-mono)] text-xs leading-relaxed text-[var(--color-text)] focus:border-[var(--color-vp-pink)] focus:outline-none"
              />

              {links.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
                    detected links
                  </span>
                  {links.map((l) => (
                    <div
                      key={l.url}
                      className="flex items-center gap-2 text-[11px]"
                    >
                      <Tag
                        variant={
                          l.kind === "eip"
                            ? "pink"
                            : l.kind === "forum"
                              ? "cyan"
                              : l.kind === "repo"
                                ? "purple"
                                : "neutral"
                        }
                      >
                        {l.kind}
                        {l.eipNumber ? ` ${l.eipNumber}` : ""}
                      </Tag>
                      <span className="flex-1 truncate font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">
                        {l.url}
                      </span>
                      {fetchedContext[l.url] ? (
                        <span className="text-[var(--color-matrix)]">✓</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fetchLink(l.url)}
                          className="border border-[var(--color-vp-cyan)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] uppercase text-[var(--color-vp-cyan)] hover:bg-[rgba(1,205,254,0.1)]"
                        >
                          fetch
                        </button>
                      )}
                    </div>
                  ))}
                  <p className="font-[family-name:var(--font-mono)] text-[9px] text-[var(--color-text-dim)]">
                    fetch pulls eips.ethereum.org / raw github / magicians /
                    ethresear.ch only. Others: paste manually.
                  </p>
                </div>
              )}

              <PixelButton
                variant="primary"
                onClick={launch}
                disabled={!canStart || busy}
                className="w-full"
              >
                {busy && phase === "upload"
                  ? "fetching EIP + starting…"
                  : "↳ Launch deep research"}
              </PixelButton>
              <p className="font-[family-name:var(--font-mono)] text-[9px] text-[var(--color-text-dim)]">
                {!canStart
                  ? "need: api key + model + EIP text or a fetchable link."
                  : "links are fetched automatically on launch so the model reads the real spec."}
              </p>
              {error && phase === "upload" && (
                <p className="border-2 border-[var(--color-vp-pink)] bg-[rgba(255,0,110,0.08)] px-2 py-1.5 font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-vp-pink)]">
                  {error}
                </p>
              )}
            </div>
          </WindowFrame>

          {/* Cost meter */}
          <WindowFrame title="~/eiplab/usage" accent="mint" controls={false}>
            <div className="grid grid-cols-3 gap-2 text-center font-[family-name:var(--font-mono)]">
              <Meter label="prompt" value={tokens.prompt} />
              <Meter label="completion" value={tokens.completion} />
              <Meter label="total tok" value={tokens.total} accent />
            </div>
            <div className="mt-2 flex items-center justify-between border-2 border-[var(--color-matrix)] px-3 py-2 font-[family-name:var(--font-mono)] glow-matrix">
              <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">
                est. cost (usd)
              </span>
              <span className="text-lg font-bold tabular-nums text-[var(--color-matrix)]">
                {costUsd > 0
                  ? `$${costUsd.toFixed(2)}`
                  : selectedModel?.inputUsdPerMtok != null
                    ? "$0.00"
                    : "—"}
              </span>
            </div>
            {tokens.cached > 0 && (
              <p className="mt-2 font-[family-name:var(--font-mono)] text-[9px] text-[var(--color-matrix)]">
                ♻ {tokens.cached.toLocaleString()} cached prompt tok billed at
                the cached rate — extra research exchanges are cheap.
              </p>
            )}
            <p className="mt-2 font-[family-name:var(--font-mono)] text-[9px] text-[var(--color-text-dim)]">
              {selectedModel?.inputUsdPerMtok != null
                ? "estimated from the model's per-Mtok pricing (cache-aware) × tokens used. logged anonymously for EVVM's AI + EIP cost research."
                : "pick a model with pricing to see live cost. counts logged for EVVM's AI + EIP cost research."}
            </p>
          </WindowFrame>
        </div>

        {/* RIGHT: conversation + output */}
        <WindowFrame
          title={`~/eiplab/${phase}`}
          accent="purple"
          flush
          className="min-h-[600px]"
        >
          <div className="flex h-[600px] flex-col">
            <div
              ref={transcriptRef}
              className="flex-1 space-y-4 overflow-auto p-4"
            >
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center text-center">
                  <div className="max-w-md font-[family-name:var(--font-mono)] text-sm text-[var(--color-text-dim)]">
                    <p className="mb-2 text-[var(--color-vp-purple)] glow-purple">
                      ▊ EVVM EIP Lab
                    </p>
                    <p>
                      Configure a provider, paste or upload an EIP, and
                      launch. The Lab researches it against the full EVVM
                      stack, asks you up to 5 questions to find the happy
                      path, then hands back documented Solidity.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <Bubble key={i} role={msg.role} content={msg.content} />
              ))}

              {busy && (
                <div className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-matrix)]">
                  <div>
                    <span className="cursor-blink">▊</span>{" "}
                    {live?.reasoning ? "reasoning" : "writing"}…
                    {live?.seconds ? (
                      <span className="text-[var(--color-text-dim)]">
                        {" "}
                        {live.seconds}s
                      </span>
                    ) : null}
                    {live?.reasoning && (
                      <span className="text-[var(--color-text-dim)]">
                        {" "}
                        — model is thinking; first output may take a minute on
                        reasoning models
                      </span>
                    )}
                  </div>
                  {!stripThinking && live?.preview && (
                    <pre className="mt-1 max-h-16 overflow-hidden whitespace-pre-wrap break-words text-[10px] leading-snug text-[var(--color-text-dim)] opacity-70">
                      {live.preview}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Phase action bar */}
            {messages.length > 0 && (
              <div
                className="flex flex-wrap items-center gap-2 border-t p-3"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              >
                {error && (
                  <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-vp-pink)]">
                    {error}
                  </span>
                )}

                {notice && !error && (
                  <span className="w-full font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-amber)]">
                    ⚠ {notice}
                  </span>
                )}

                {truncated && !busy && (
                  <PixelButton
                    variant="phosphor"
                    size="sm"
                    onClick={() =>
                      send(
                        phase,
                        "Continue exactly where you left off. Do not repeat anything already written — if you stopped mid-file, resume mid-file and keep the FILE: structure intact.",
                        { append: true },
                      )
                    }
                  >
                    ⚠ truncated → continue
                  </PixelButton>
                )}

                {phase === "research" && !busy && (
                  <>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
                      deep research ·{" "}
                      {Math.min(researchTurns, MAX_RESEARCH_TURNS)}/
                      {MAX_RESEARCH_TURNS}
                    </span>
                    <PixelButton
                      variant="phosphor"
                      size="sm"
                      onClick={() =>
                        send(
                          "contracts",
                          "The happy path is settled. Generate the documented Solidity now per our research — one FILE: marker per file, plus the justification. Modify EVVM core contracts as diffs where we decided; otherwise add the services / mocks.",
                        )
                      }
                    >
                      ↳ generate contracts
                    </PixelButton>
                  </>
                )}

                <FollowUp
                  onSend={(text) => {
                    const p = phase === "upload" ? "research" : phase;
                    if (p === "research") {
                      // Cap the research conversation at 5 exchanges.
                      if (researchTurns >= MAX_RESEARCH_TURNS) {
                        setError(
                          `Reached the ${MAX_RESEARCH_TURNS}-exchange research limit — generate the contracts.`,
                        );
                        return;
                      }
                      setResearchTurns((t) => t + 1);
                      send("research", text);
                      return;
                    }
                    // During the file-generating phases, a follow-up
                    // ("keep going", a correction) must ADD to the
                    // existing files, not clobber them.
                    const append = p === "contracts" || p === "review";
                    send(p, text, append ? { append: true } : undefined);
                  }}
                  disabled={
                    busy ||
                    (phase === "research" &&
                      researchTurns >= MAX_RESEARCH_TURNS)
                  }
                />
              </div>
            )}
          </div>
        </WindowFrame>
      </div>

      {/* Output files */}
      {files.length > 0 && (
        <div className="mt-4">
          <WindowFrame title="~/eiplab/output" accent="mint" glow>
            {truncated && (
              <div className="mb-3 border-2 border-[var(--color-amber)] bg-[rgba(255,176,0,0.08)] px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-amber)]">
                ⚠ last response was cut off at the token limit — files may be
                incomplete. Click &quot;truncated → continue&quot; above before
                downloading.
              </div>
            )}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-text)]">
                {files.length} file{files.length === 1 ? "" : "s"} generated
              </span>
              <div className="flex flex-wrap gap-2">
                <PixelButton
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    send(
                      "review",
                      "Review your generated Solidity above as a strict compiler + auditor. Fix every compile error (especially 0x... / ... placeholders, mappings inside memory structs, undeclared identifiers), every no-op or self-referential check, and every spot you left as 'placeholder' or 'incorrect'. Output the COMPLETE corrected set of files with FILE: markers, then a short FILE: justification.md.",
                      { append: false },
                    )
                  }
                  disabled={busy}
                >
                  ⟳ review &amp; fix
                </PixelButton>
                <PixelButton variant="phosphor" size="sm" onClick={downloadAll}>
                  ↓ download .zip
                </PixelButton>
                <PixelButton variant="ghost" size="sm" onClick={reset}>
                  new run
                </PixelButton>
              </div>
            </div>
            <ul className="space-y-1 font-[family-name:var(--font-mono)] text-xs">
              {files.map((f) => (
                <li
                  key={f.path}
                  className="flex items-center gap-2 text-[var(--color-text-muted)]"
                >
                  <span className="text-[var(--color-matrix)]">
                    {f.lang === "solidity" ? "◆" : "○"}
                  </span>
                  <span className="flex-1 truncate">{f.path}</span>
                  <button
                    type="button"
                    onClick={() =>
                      downloadBlob(
                        new Blob([f.content], { type: "text/plain" }),
                        f.path.split("/").pop() ?? "file.txt",
                      )
                    }
                    className="border border-[rgba(255,255,255,0.2)] px-1.5 py-0.5 text-[9px] uppercase text-[var(--color-text-muted)] hover:border-[var(--color-vp-cyan)] hover:text-[var(--color-vp-cyan)]"
                  >
                    ↓
                  </button>
                </li>
              ))}
            </ul>
          </WindowFrame>
        </div>
      )}
    </div>
  );
}

function Meter({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`border px-2 py-2 ${
        accent
          ? "border-[var(--color-matrix)] text-[var(--color-matrix)] glow-matrix"
          : "border-[rgba(255,255,255,0.12)] text-[var(--color-text)]"
      }`}
    >
      <div className="text-lg font-bold tabular-nums">{value.toLocaleString()}</div>
      <div className="text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">
        {label}
      </div>
    </div>
  );
}

function Bubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] border-2 px-3 py-2 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed ${
          isUser
            ? "border-[var(--color-vp-pink)] bg-[rgba(255,113,206,0.06)] text-[var(--color-text)]"
            : "border-[rgba(255,255,255,0.12)] bg-[#0a0014] text-[var(--color-text)]"
        }`}
      >
        <div className="mb-1 text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">
          {isUser ? "you" : "eip lab"}
        </div>
        <pre className="whitespace-pre-wrap break-words font-[family-name:var(--font-mono)]">
          {content}
        </pre>
      </div>
    </div>
  );
}

function FollowUp({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <form
      className="flex flex-1 items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim() && !disabled) {
          onSend(text.trim());
          setText("");
        }
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="reply / correct / ask…"
        disabled={disabled}
        className="min-w-0 flex-1 border-2 border-[rgba(255,255,255,0.15)] bg-[#07010f] px-2 py-1.5 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text)] focus:border-[var(--color-vp-purple)] focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="border-2 border-[var(--color-vp-purple)] px-3 py-1.5 font-[family-name:var(--font-mono)] text-xs uppercase text-[var(--color-vp-purple)] hover:bg-[rgba(185,103,255,0.12)] disabled:opacity-40"
      >
        send
      </button>
    </form>
  );
}
