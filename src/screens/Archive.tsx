"use client";
// 화면 I — 개인 인생 아카이브. 데모: 기록은 이 브라우저 메모리(또는 선택 시 이 탭)에만 있다.
import { useMemo, useState } from "react";
import { useStore, SaveMode } from "@/state/store";
import { useRouter } from "@/ui/router";
import { Page, ScreenTitle, SampleBanner, NextStep } from "@/ui/layout";
import { Badge, Button, Field, Notice, SectionHead, Segmented, cx, inputCls } from "@/ui/kit";
import { ArchiveRecord, RECORD_TYPE_LABEL, RecordType } from "@/content/sample";
import { buildYears, yearBlock } from "@/rules/interpret";

const TYPES = Object.keys(RECORD_TYPE_LABEL) as RecordType[];
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const textareaCls = "w-full min-h-[6rem] rounded-xl bg-night border border-line px-4 py-3 text-ivory placeholder:text-faint focus:border-gold/70 outline-none leading-relaxed";
const when = (r: ArchiveRecord) => `${r.year}${r.month ? `.${String(r.month).padStart(2, "0")}` : ""}`;
const sortKey = (r: ArchiveRecord) => r.year * 100 + (r.month ?? 0);

function RecordSheet({ initial, onClose }: { initial: ArchiveRecord; onClose: () => void }) {
  const { dispatch, toast } = useStore();
  const [d, setD] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const thisYear = new Date().getFullYear();
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.title.trim()) return setErr("제목을 적어 주세요.");
    if (!Number.isInteger(d.year) || d.year < 1900 || d.year > thisYear + 30) return setErr(`연도는 1900~${thisYear + 30} 사이로 입력해 주세요.`);
    if (d.month !== null && (!Number.isInteger(d.month) || d.month < 1 || d.month > 12)) return setErr("월은 1~12 사이로 입력하거나 비워 두세요.");
    dispatch({ type: "upsertRecord", record: { ...d, title: d.title.trim(), note: d.note.trim(), sample: initial.sample && d === initial } });
    toast(initial.title ? "기록을 수정했습니다." : "기록을 추가했습니다.");
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={initial.title ? "기록 수정" : "기록 추가"}>
      <button className="absolute inset-0 bg-black/55 cursor-default" aria-label="닫기" onClick={onClose} />
      <form onSubmit={save} noValidate
        className="screen-enter absolute inset-x-0 bottom-0 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[34rem] max-h-[90dvh] overflow-y-auto rounded-t-3xl lg:rounded-3xl bg-deep border border-line p-5 gutter flex flex-col gap-4 safe-bottom">
        <div className="flex items-center">
          <h2 className="font-display text-[1.2rem] font-semibold">{initial.title ? "기록 수정" : "새 기록"}</h2>
          <Button type="button" variant="quiet" size="sm" className="ml-auto" onClick={onClose}>취소</Button>
        </div>
        <Field label="종류">
          <Segmented<RecordType> label="기록 종류" size="sm" value={d.type} options={TYPES.map((t) => ({ value: t, label: RECORD_TYPE_LABEL[t] }))} onChange={(v) => setD({ ...d, type: v })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="연도" htmlFor="rec-year">
            <input id="rec-year" inputMode="numeric" className={inputCls} value={Number.isFinite(d.year) ? d.year : ""} onChange={(e) => setD({ ...d, year: e.target.value === "" ? NaN : Number(e.target.value) })} />
          </Field>
          <Field label="월 (선택)" htmlFor="rec-month">
            <input id="rec-month" inputMode="numeric" className={inputCls} placeholder="비워 두기" value={d.month ?? ""} onChange={(e) => setD({ ...d, month: e.target.value === "" ? null : Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="제목" htmlFor="rec-title">
          <input id="rec-title" className={inputCls} maxLength={60} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="예: 첫 프로젝트 공개" />
        </Field>
        <Field label="메모" htmlFor="rec-note" hint="사실 위주로 적으면 나중에 돌아보기 좋습니다.">
          <textarea id="rec-note" className={textareaCls} maxLength={600} value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} />
        </Field>
        {err && <p role="alert" className="text-[0.85rem] text-warn">{err}</p>}
        <Button type="submit" size="lg">저장</Button>
        <p className="text-[0.75rem] text-faint text-center">데모: 이 기록은 서버로 전송되지 않습니다.</p>
      </form>
    </div>
  );
}

function RecordItem({ r, theme, onEdit }: { r: ArchiveRecord; theme: string | null; onEdit: () => void }) {
  const { dispatch, toast } = useStore();
  const [confirm, setConfirm] = useState(false);
  return (
    <li className="rounded-2xl border border-line/70 bg-deep p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular text-[0.85rem] text-gold">{when(r)}</span>
        <span className="text-[0.75rem] text-mist border border-line rounded-full px-2.5 h-6 inline-flex items-center">{RECORD_TYPE_LABEL[r.type]}</span>
        {r.sample ? <Badge layer="sample">예시</Badge> : <Badge layer="user" />}
      </div>
      <div>
        <h3 className="text-[1rem] text-ivory font-medium leading-snug">{r.title}</h3>
        {r.note && <p className="mt-1 text-[0.9rem] text-ivory/80 leading-relaxed whitespace-pre-wrap">{r.note}</p>}
      </div>
      {r.type === "event" && theme && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-xl bg-night/60 border border-line/60 p-3">
            <p className="text-[0.72rem] text-ok mb-0.5">내가 쓴 사실</p>
            <p className="text-[0.86rem] text-ivory/90">{r.title}</p>
          </div>
          <div className="rounded-xl bg-night/60 border border-line/60 p-3">
            <p className="text-[0.72rem] text-mist mb-0.5">그해의 전통 해석 주제</p>
            <p className="text-[0.86rem] text-ivory/90">{theme}</p>
          </div>
          <p className="sm:col-span-2 text-[0.75rem] text-faint">기록은 당신이 쓴 사실이며, 사주가 맞혔다는 뜻이 아닙니다.</p>
        </div>
      )}
      <div className="flex items-center gap-1 -mb-1">
        {confirm ? (
          <>
            <span className="text-[0.82rem] text-warn mr-2">이 기록을 삭제할까요?</span>
            <Button size="sm" variant="ghost" onClick={() => { dispatch({ type: "deleteRecord", id: r.id }); toast("기록을 삭제했습니다."); }}>삭제</Button>
            <Button size="sm" variant="quiet" onClick={() => setConfirm(false)}>취소</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="quiet" onClick={onEdit}>수정</Button>
            <Button size="sm" variant="quiet" onClick={() => setConfirm(true)}>삭제</Button>
          </>
        )}
      </div>
    </li>
  );
}

export function Archive() {
  const { state, dispatch, chart, toast } = useStore();
  const { go } = useRouter();
  const [typeFilter, setTypeFilter] = useState<RecordType | "all">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [sheet, setSheet] = useState<ArchiveRecord | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [jsonOut, setJsonOut] = useState<string | null>(null);

  const records = state.records;
  const sorted = useMemo(() => [...records].sort((a, b) => sortKey(b) - sortKey(a)), [records]);
  const years = useMemo(() => [...new Set(sorted.map((r) => r.year))], [sorted]);
  const visible = sorted.filter((r) => (typeFilter === "all" || r.type === typeFilter) && (yearFilter === "all" || String(r.year) === yearFilter));

  const yearCells = useMemo(() => buildYears(chart), [chart]);
  const themeOf = (year: number) => {
    const cell = yearCells.find((c) => c.year === year);
    return cell ? yearBlock(chart, cell).title : null;
  };

  const reviews = sorted.filter((r) => r.type === "review");
  const [cmpA, setCmpA] = useState<string>("");
  const [cmpB, setCmpB] = useState<string>("");
  const past = reviews.find((r) => r.id === cmpA) ?? reviews[1] ?? null;
  const present = reviews.find((r) => r.id === cmpB) ?? reviews[0] ?? null;

  const exportJson = () => JSON.stringify({
    exportedAt: new Date().toISOString(),
    note: "운명OS Phase 1 데모 내보내기. 예시(sample: true) 기록 포함.",
    profile: state.profileIsSample ? "sample" : { name: state.profile?.name },
    records,
  }, null, 2);

  const download = () => {
    try {
      const blob = new Blob([exportJson()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `destiny-os-archive-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("JSON 파일 다운로드를 시작했습니다. 막혀 있다면 'JSON 복사'를 쓰세요.");
    } catch {
      setJsonOut(exportJson());
    }
  };
  const copy = () => {
    const text = exportJson();
    try {
      navigator.clipboard.writeText(text).then(() => toast("JSON을 복사했습니다."), () => setJsonOut(text));
    } catch {
      setJsonOut(text);
    }
  };

  const blank = (): ArchiveRecord => ({ id: newId(), type: "event", year: new Date().getFullYear(), month: new Date().getMonth() + 1, title: "", note: "", sample: false });

  return (
    <Page>
      <ScreenTitle
        eyebrow="인생 아카이브"
        title="쌓일수록 선명해지는 나의 기록"
        desc="인생 사건, 목표, 질문, 회고를 연도별로 남기고 전통 해석의 그해 주제와 나란히 돌아봅니다."
      />
      <SampleBanner />
      <Notice tone="demo" title="데모 — 서버에 저장되지 않습니다">
        지금 기록은 이 브라우저에만 있습니다. 실제 서비스에서는 계정에 암호화해 저장하고, 내려받기와 삭제 요청을 언제든 처리합니다.
      </Notice>

      <section className="flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <SectionHead eyebrow="01 · 기록" title={`${records.length}개의 기록`} />
          <Button className="ml-auto shrink-0" size="sm" onClick={() => setSheet(blank())}><span aria-hidden>+</span> 기록 추가</Button>
        </div>
        <Segmented<RecordType | "all"> label="종류로 거르기" size="sm" value={typeFilter}
          options={[{ value: "all", label: "전체" }, ...TYPES.map((t) => ({ value: t, label: RECORD_TYPE_LABEL[t] }))]}
          onChange={setTypeFilter} />
        <div className="flex items-center gap-2">
          <label htmlFor="year-filter" className="text-[0.85rem] text-mist">연도</label>
          <select id="year-filter" className={cx(inputCls, "h-10 w-auto")} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="all">전체</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center">
            <p className="text-ivory">{records.length === 0 ? "아직 기록이 없습니다." : "조건에 맞는 기록이 없습니다."}</p>
            <p className="text-[0.88rem] text-mist mt-1">기억에 남는 사건 하나부터 적어 보세요. 연도만 알아도 충분합니다.</p>
            <Button className="mt-4" size="sm" onClick={() => setSheet(blank())}>첫 기록 쓰기</Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((r) => <RecordItem key={r.id} r={r} theme={r.type === "event" ? themeOf(r.year) : null} onEdit={() => setSheet(r)} />)}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="02 · 과거의 나와 현재의 나" title="두 회고를 나란히" desc="회고 기록 두 개를 골라 비교합니다." />
        {reviews.length < 2 ? (
          <p className="text-[0.9rem] text-mist">회고 기록이 두 개 이상 있어야 비교할 수 있습니다.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([["과거", past, setCmpA], ["현재", present, setCmpB]] as const).map(([label, rec, setter]) => (
              <div key={label} className="rounded-2xl border border-line/70 bg-deep p-4 flex flex-col gap-3 min-w-0">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[0.78rem] text-faint">{label}</span>
                  <select className={cx(inputCls, "h-10")} value={rec?.id ?? ""} onChange={(e) => setter(e.target.value)}>
                    {reviews.map((r) => <option key={r.id} value={r.id}>{when(r)} · {r.title}</option>)}
                  </select>
                </label>
                {rec && (
                  <>
                    <div className="flex items-center gap-2"><span className="tabular text-gold text-[0.85rem]">{when(rec)}</span>{rec.sample && <Badge layer="sample">예시</Badge>}</div>
                    <p className="text-[0.92rem] text-ivory/90 leading-relaxed whitespace-pre-wrap">{rec.note || rec.title}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="03 · 연도별 회고" title="해마다 무엇을 남겼나" />
        {years.length === 0 ? <p className="text-[0.9rem] text-mist">기록이 쌓이면 연도별로 정리됩니다.</p> : (
          <div className="rounded-2xl border border-line/70 bg-deep overflow-x-auto">
            <table className="w-full text-[0.86rem] min-w-[20rem]">
              <caption className="sr-only">연도별 기록 개수</caption>
              <thead>
                <tr className="text-faint text-[0.75rem] text-left">
                  <th scope="col" className="px-4 py-2.5 font-normal">연도</th>
                  {TYPES.map((t) => <th key={t} scope="col" className="px-2 py-2.5 font-normal text-right">{RECORD_TYPE_LABEL[t]}</th>)}
                  <th scope="col" className="px-4 py-2.5 font-normal text-right"><span className="sr-only">보기</span></th>
                </tr>
              </thead>
              <tbody>
                {years.map((y) => (
                  <tr key={y} className="border-t border-line/60">
                    <th scope="row" className="px-4 py-2.5 text-left font-normal tabular text-ivory">{y}</th>
                    {TYPES.map((t) => {
                      const n = records.filter((r) => r.year === y && r.type === t).length;
                      return <td key={t} className={cx("px-2 py-2.5 text-right tabular", n ? "text-ivory" : "text-faint")}>{n || "–"}</td>;
                    })}
                    <td className="px-4 py-2.5 text-right">
                      <button className="text-[0.8rem] text-mist hover:text-gold cursor-pointer" onClick={() => { setYearFilter(String(y)); setTypeFilter("all"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>보기</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Button variant="ghost" size="sm" className="self-start" onClick={() => go("map")}>인생 지도에서 연도별 주제 보기</Button>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHead eyebrow="04 · 내 데이터" title="내보내기와 삭제" desc="내 기록은 언제든 가져가고, 언제든 지울 수 있어야 합니다." />
        <div className="rounded-2xl border border-line/70 bg-deep p-5 flex flex-col gap-5">
          <Field label="저장 방식">
            <Segmented<SaveMode> label="저장 방식" size="sm" value={state.saveMode}
              options={[{ value: "memory", label: "메모리에만 (새로고침 시 삭제)" }, { value: "session", label: "이 탭에 임시 보관" }]}
              onChange={(v) => { dispatch({ type: "setSaveMode", value: v }); toast(v === "memory" ? "이제 새로고침하면 모두 사라집니다." : "이 탭을 닫기 전까지 임시 보관합니다."); }} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={download}>데이터 다운로드 (JSON)</Button>
            <Button size="sm" variant="ghost" onClick={copy}>JSON 복사</Button>
            {!confirmClear && <Button size="sm" variant="quiet" onClick={() => setConfirmClear(true)} disabled={records.length === 0}>기록 전체 삭제</Button>}
          </div>
          {confirmClear && (
            <div className="rounded-xl border border-warn/40 bg-warn/5 p-4 flex flex-wrap items-center gap-3">
              <p className="text-[0.88rem] text-ivory/90 flex-1 min-w-[12rem]">기록 {records.length}개를 모두 지웁니다. 되돌릴 수 없습니다.</p>
              <Button size="sm" variant="ghost" onClick={() => { dispatch({ type: "clearRecords" }); setConfirmClear(false); toast("모든 기록을 삭제했습니다."); }}>모두 삭제</Button>
              <Button size="sm" variant="quiet" onClick={() => setConfirmClear(false)}>취소</Button>
            </div>
          )}
          {jsonOut && (
            <div className="flex flex-col gap-2">
              <label htmlFor="json-out" className="text-[0.82rem] text-mist">이 화면에서는 파일 저장이나 복사가 막혀 있습니다. 아래 내용을 직접 선택해 복사하세요.</label>
              <textarea id="json-out" readOnly value={jsonOut} onFocus={(e) => e.currentTarget.select()} className="w-full h-48 rounded-xl bg-night border border-line p-3 font-mono text-[0.75rem] text-ivory/90" />
              <Button size="sm" variant="quiet" className="self-start" onClick={() => setJsonOut(null)}>닫기</Button>
            </div>
          )}
        </div>
      </section>

      <NextStep title="인생 지도" desc="기록한 해가 0~90세 흐름 중 어디에 있는지 확인해 보세요." onClick={() => go("map")} />

      {sheet && <RecordSheet initial={sheet} onClose={() => setSheet(null)} />}
    </Page>
  );
}
