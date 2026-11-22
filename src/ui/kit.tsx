"use client";
import { useId, useState } from "react";
import { RULE_MAP } from "@/rules/registry";
import type { Block } from "@/rules/interpret";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// ---------- Buttons ----------
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "quiet" | "paper"; size?: "md" | "lg" | "sm" };
export function Button({ variant = "primary", size = "md", className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none",
        size === "lg" && "h-14 px-7 text-[1.02rem]",
        size === "md" && "h-11 px-5 text-[0.95rem]",
        size === "sm" && "h-9 px-4 text-sm",
        variant === "primary" && "bg-gold text-ink hover:brightness-110",
        variant === "ghost" && "border border-line text-ivory hover:border-gold/60 hover:text-gold",
        variant === "quiet" && "text-mist hover:text-ivory",
        variant === "paper" && "bg-ink text-ivory hover:bg-raised",
        className,
      )}
    />
  );
}

// ---------- Layer badges: 계산 / 전통 규칙 / 해설 / 사용자 기록 / 데모 ----------
export type Layer = "calc" | "rule" | "copy" | "user" | "demo" | "unverified" | "premium" | "sample" | "practical";
const LAYER: Record<Layer, { label: string; cls: string; title: string }> = {
  calc: { label: "계산", cls: "border-gold/50 text-gold", title: "결정론적 계산 엔진의 결과" },
  rule: { label: "전통 해석", cls: "border-mist/40 text-mist", title: "전통 규칙에 근거한 해석" },
  copy: { label: "해설 문안", cls: "border-mist/30 text-faint", title: "규칙 결과를 쉬운 말로 옮긴 문안(AI 미사용, 데모)" },
  user: { label: "내 기록", cls: "border-[#6fbf9a]/50 text-ok", title: "사용자가 직접 작성한 사실" },
  demo: { label: "데모", cls: "border-warn/60 text-warn", title: "실제 동작하지 않는 데모 기능" },
  unverified: { label: "미검증", cls: "border-warn/60 text-warn", title: "독립 자료 대조 전" },
  premium: { label: "프리미엄", cls: "border-gold/50 text-gold", title: "인생 마스터 리포트에 포함" },
  sample: { label: "샘플", cls: "border-warn/60 text-warn", title: "예시 데이터" },
  practical: { label: "현실 조언", cls: "border-[#6fbf9a]/50 text-ok", title: "사주와 무관한 일반 실행 조언" },
};
export function Badge({ layer, className, children }: { layer: Layer; className?: string; children?: React.ReactNode }) {
  const l = LAYER[layer];
  return (
    <span title={l.title} className={cx("inline-flex items-center h-6 px-2.5 rounded-full border text-[0.7rem] font-medium tracking-wide whitespace-nowrap", l.cls, className)}>
      {children ?? l.label}
    </span>
  );
}

// ---------- Section heading ----------
export function SectionHead({ eyebrow, title, desc, id }: { eyebrow?: string; title: string; desc?: React.ReactNode; id?: string }) {
  return (
    <header id={id} className="flex flex-col gap-2 scroll-mt-20">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="font-display text-[1.45rem] leading-snug font-semibold text-ivory">{title}</h2>
      {desc && <p className="text-mist text-[0.95rem] leading-relaxed max-w-[38rem]">{desc}</p>}
    </header>
  );
}

// ---------- Card ----------
export function Card({ className, children, as: As = "section" }: { className?: string; children: React.ReactNode; as?: "section" | "div" | "article" }) {
  return <As className={cx("rounded-2xl bg-deep border border-line/70 p-5", className)}>{children}</As>;
}

// ---------- Evidence (근거 펼쳐보기) ----------
export function Evidence({ block, label = "왜 그런가요?" }: { block: Pick<Block, "ruleIds" | "facts" | "alt">; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-[0.8rem] text-mist hover:text-gold cursor-pointer"
      >
        <span aria-hidden className={cx("inline-block transition-transform", open && "rotate-90")}>›</span>
        {label}
      </button>
      {open && (
        <div id={id} className="mt-3 rounded-xl bg-night/70 border border-line/70 p-4 flex flex-col gap-3 text-[0.82rem]">
          <div>
            <div className="flex items-center gap-2 mb-1.5"><Badge layer="calc" /><span className="text-faint">계산 근거</span></div>
            <ul className="flex flex-col gap-1 text-ivory/90 font-mono text-[0.78rem]">
              {block.facts.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
          {block.ruleIds.map((rid) => {
            const r = RULE_MAP[rid];
            if (!r) return null;
            return (
              <div key={rid} className="border-t border-line/60 pt-3">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <Badge layer="rule" />
                  <span className="font-mono text-[0.72rem] text-gold">{r.rule_id}</span>
                  <span className="text-ivory">{r.rule_name}</span>
                </div>
                <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-mist">
                  <dt className="text-faint">참고 관점</dt><dd>{r.source_title} · {r.school}</dd>
                  <dt className="text-faint">원문 위치</dt><dd>{r.source_location ?? "검수 전 — 원문 대조 후 기재"}</dd>
                  <dt className="text-faint">조건</dt><dd>{r.conditions}</dd>
                  <dt className="text-faint">검수 상태</dt><dd>{r.review_status === "draft" ? "초안(명리 검수자 확인 전)" : r.review_status}</dd>
                  {r.alternative_interpretations.length > 0 && (<><dt className="text-faint">다른 해석</dt><dd>{r.alternative_interpretations.join(" / ")}</dd></>)}
                  {r.conflicts.length > 0 && (<><dt className="text-faint">쟁점</dt><dd>{r.conflicts.join(" / ")}</dd></>)}
                </dl>
              </div>
            );
          })}
          {block.alt && block.alt.length > 0 && (
            <p className="border-t border-line/60 pt-3 text-mist"><span className="text-faint">이 문장에 대한 다른 읽기 · </span>{block.alt.join(" ")}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Interpretation card ----------
export function ReadingCard({ block, eyebrow, tone = "deep", children }: { block: Block; eyebrow?: string; tone?: "deep" | "raised"; children?: React.ReactNode }) {
  return (
    <article className={cx("rounded-2xl border border-line/70 p-5", tone === "deep" ? "bg-deep" : "bg-raised")}>
      <div className="flex items-center gap-2 mb-2">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      </div>
      <h3 className="font-display text-[1.12rem] leading-snug font-semibold text-ivory">{block.title}</h3>
      <p className="mt-2 text-[0.95rem] text-ivory/85 leading-relaxed">{block.body}</p>
      {block.question && (
        <p className="mt-3 text-[0.9rem] text-gold/90 leading-relaxed"><span className="text-faint">스스로에게 묻기 · </span>{block.question}</p>
      )}
      {children}
      <Evidence block={block} />
    </article>
  );
}

// ---------- Segmented control ----------
export function Segmented<T extends string>({ value, options, onChange, label, size = "md" }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string; size?: "sm" | "md" }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-full border transition-colors cursor-pointer",
            size === "md" ? "h-11 px-4 text-[0.92rem]" : "h-9 px-3.5 text-[0.84rem]",
            value === o.value ? "border-gold bg-gold/10 text-gold" : "border-line text-mist hover:text-ivory hover:border-mist/50",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Notice ----------
export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warn" | "demo"; title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx(
      "rounded-xl border px-4 py-3 text-[0.85rem] leading-relaxed",
      tone === "info" && "border-line bg-deep/60 text-mist",
      tone === "warn" && "border-warn/40 bg-warn/5 text-ivory/90",
      tone === "demo" && "border-warn/40 bg-warn/5 text-ivory/90",
      className,
    )}>
      {title && <p className={cx("font-medium mb-0.5", tone === "info" ? "text-ivory" : "text-warn")}>{title}</p>}
      {children}
    </div>
  );
}

// ---------- Form field ----------
export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: React.ReactNode; error?: string | null; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[0.9rem] text-ivory font-medium">{label}</label>
      {children}
      {hint && !error && <p className="text-[0.8rem] text-faint leading-relaxed">{hint}</p>}
      {error && <p role="alert" className="text-[0.82rem] text-warn">{error}</p>}
    </div>
  );
}

export const inputCls = "h-12 w-full rounded-xl bg-night border border-line px-4 text-ivory placeholder:text-faint focus:border-gold/70 outline-none tabular";

// ---------- Premium lock (내용을 가리지 않고 '무엇이 열리는지'를 설명) ----------
export function PremiumGate({ title, items, onOpen }: { title: string; items: string[]; onOpen: () => void }) {
  return (
    <div className="rounded-2xl border border-gold/30 bg-gradient-to-b from-raised to-deep p-5">
      <div className="flex items-center gap-2"><Badge layer="premium" /><span className="text-[0.8rem] text-faint">인생 마스터 리포트</span></div>
      <h3 className="mt-2 font-display text-[1.08rem] font-semibold">{title}</h3>
      <ul className="mt-3 flex flex-col gap-1.5 text-[0.9rem] text-mist">
        {items.map((i) => <li key={i} className="flex gap-2"><span aria-hidden className="text-gold">·</span>{i}</li>)}
      </ul>
      <Button className="mt-4" size="sm" onClick={onOpen}>무엇이 포함되는지 보기</Button>
    </div>
  );
}

export function Divider() {
  return <hr className="border-0 h-px bg-line/70 my-2" />;
}
