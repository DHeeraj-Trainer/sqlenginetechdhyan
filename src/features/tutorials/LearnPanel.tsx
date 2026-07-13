// @ts-nocheck
import { useMemo, useState } from "react";
import { BookOpen, ChevronRight, GraduationCap, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getLegacyDomains, getLegacyChapters, legacySyllabus } from "./legacy-adapter";
import { useEngine } from "@/lib/db/engine-provider";
import { toast } from "sonner";

interface Props {
  onOpenInEditor: (sql: string, filename?: string) => void;
}

export function LearnPanel({ onOpenInEditor }: Props) {
  const domains = useMemo(() => getLegacyDomains(), []);
  const chapters = useMemo(() => getLegacyChapters(), []);
  const [domainId, setDomainId] = useState(domains[0]?.id ?? "");
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");

  const domain = domains.find((d) => d.id === domainId);
  const chapter = chapters.find((c) => c.id === chapterId);

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="domains" className="flex h-full flex-col">
        <div className="border-b bg-muted/30 px-3">
          <TabsList className="h-9 bg-transparent">
            <TabsTrigger value="domains" className="text-xs">
              <GraduationCap className="mr-1 h-3.5 w-3.5" /> Domains
            </TabsTrigger>
            <TabsTrigger value="docs" className="text-xs">
              <BookOpen className="mr-1 h-3.5 w-3.5" /> Docs
            </TabsTrigger>
            <TabsTrigger value="syllabus" className="text-xs">
              Syllabus
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="text-xs">
              <HelpCircle className="mr-1 h-3.5 w-3.5" /> Quiz
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="domains" className="m-0 flex-1 overflow-hidden">
          <div className="grid h-full grid-cols-[220px_1fr]">
            <ul className="overflow-y-auto border-r text-xs">
              {domains.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setDomainId(d.id)}
                    className={`flex w-full items-center gap-2 border-b px-3 py-2 text-left hover:bg-muted ${
                      d.id === domainId ? "bg-muted font-semibold" : ""
                    }`}
                  >
                    <ChevronRight className="h-3 w-3" /> {d.name}
                  </button>
                </li>
              ))}
            </ul>
            <div className="overflow-y-auto p-4 text-sm">
              {domain && <DomainDetail domain={domain} onOpenInEditor={onOpenInEditor} />}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="docs" className="m-0 flex-1 overflow-hidden">
          <div className="grid h-full grid-cols-[240px_1fr]">
            <ul className="overflow-y-auto border-r text-xs">
              {chapters.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setChapterId(c.id)}
                    className={`flex w-full items-center gap-2 border-b px-3 py-2 text-left hover:bg-muted ${
                      c.id === chapterId ? "bg-muted font-semibold" : ""
                    }`}
                  >
                    <ChevronRight className="h-3 w-3" /> {c.title}
                  </button>
                </li>
              ))}
            </ul>
            <div className="overflow-y-auto p-4 text-sm">
              {chapter && (
                <article className="prose prose-sm max-w-none dark:prose-invert">
                  <h2>{chapter.title}</h2>
                  {chapter.subtitle && <p className="lead text-muted-foreground">{chapter.subtitle}</p>}
                  <p>{chapter.description}</p>
                  {chapter.sections?.map((s, i) => (
                    <section key={i}>
                      <h3>{s.title}</h3>
                      <p className="whitespace-pre-wrap">{s.description}</p>
                      {s.syntax && (
                        <pre className="rounded bg-slate-950 p-3 text-xs text-slate-100">
                          <code>{s.syntax}</code>
                        </pre>
                      )}
                      {s.example && (
                        <pre className="rounded bg-slate-950 p-3 text-xs text-slate-100">
                          <code>{s.example}</code>
                        </pre>
                      )}
                      {s.tips && (
                        <ul>
                          {s.tips.map((t, ti) => (
                            <li key={ti}>{t}</li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </article>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="syllabus" className="m-0 flex-1 overflow-y-auto p-4">
          <SyllabusView />
        </TabsContent>

        <TabsContent value="quizzes" className="m-0 flex-1 overflow-y-auto p-4">
          {domain && <MiniQuiz domainId={domain.id} quiz={domain.miniQuiz} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DomainDetail({
  domain,
  onOpenInEditor,
}: {
  domain: ReturnType<typeof getLegacyDomains>[number];
  onOpenInEditor: (sql: string, filename?: string) => void;
}) {
  const { engine, refreshTables } = useEngine();
  const loadDomain = async () => {
    if (!engine) return;
    await engine.reset();
    const script = domain.tables.map((t) => `${t.createScript}\n${t.insertScript}`).join("\n");
    await engine.loadScript(script);
    await refreshTables();
    toast.success(`Loaded ${domain.name} into ${engine.label}`);
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-bold">{domain.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{domain.businessScenario}</p>
      </header>
      <div className="flex gap-2">
        <Button size="sm" onClick={loadDomain}>
          Load into engine
        </Button>
      </div>
      <section>
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Real-world use</h3>
        <p className="text-sm">{domain.realWorldUse}</p>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tables ({domain.tables.length})
        </h3>
        <ul className="grid gap-2 md:grid-cols-2">
          {domain.tables.map((t) => (
            <li key={t.name} className="rounded border p-3 text-xs">
              <div className="mb-1 font-mono text-sm font-semibold">{t.name}</div>
              <div className="text-muted-foreground">{t.description}</div>
              <div className="mt-2 text-[11px]">{t.columns.length} columns</div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Challenges ({domain.questions.length})
        </h3>
        <ul className="space-y-2">
          {domain.questions.slice(0, 12).map((q) => (
            <li key={q.id} className="rounded border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold">
                    {q.id} · {q.category} · {q.difficulty}
                  </div>
                  <p className="mt-1 text-sm">{q.text}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenInEditor(`-- ${q.text}\n${q.expectedQuery}\n`, `${q.id}.sql`)}
                >
                  Open in editor
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SyllabusView() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {legacySyllabus.categories.map((c, i) => (
        <div key={i} className="rounded border p-3">
          <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{c.fullName}</div>
          <h3 className="mb-2 text-sm font-semibold">{c.category}</h3>
          <p className="mb-2 text-xs text-muted-foreground">{c.description}</p>
          <ul className="space-y-1 text-xs">
            {c.commands.map((cmd, j) => (
              <li key={j} className="rounded bg-muted/40 px-2 py-1">
                <span className="font-mono font-semibold">{cmd.name}</span>
                <span className="ml-2 text-muted-foreground">{cmd.description}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function MiniQuiz({ domainId, quiz }: { domainId: string; quiz: ReturnType<typeof getLegacyDomains>[number]["miniQuiz"] }) {
  const [picks, setPicks] = useState<Record<number, number>>({});
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">Quiz for domain: {domainId}</div>
      {quiz.map((q, i) => (
        <div key={i} className="rounded border p-3">
          <div className="mb-2 text-sm font-semibold">
            {i + 1}. {q.question}
          </div>
          <ul className="space-y-1">
            {q.options.map((opt, oi) => {
              const picked = picks[i];
              const isPicked = picked === oi;
              const isCorrect = picked !== undefined && oi === q.correctIndex;
              const isWrong = picked === oi && oi !== q.correctIndex;
              return (
                <li key={oi}>
                  <button
                    onClick={() => setPicks((s) => ({ ...s, [i]: oi }))}
                    className={`w-full rounded border px-3 py-1.5 text-left text-xs ${
                      isCorrect
                        ? "border-emerald-500 bg-emerald-500/10"
                        : isWrong
                          ? "border-destructive bg-destructive/10"
                          : isPicked
                            ? "bg-muted"
                            : "hover:bg-muted/40"
                    }`}
                  >
                    {opt}
                  </button>
                </li>
              );
            })}
          </ul>
          {picks[i] !== undefined && (
            <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>
          )}
        </div>
      ))}
    </div>
  );
}
