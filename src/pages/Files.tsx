import { ChevronRight, FileText, Folder, FolderOpen, MessageSquareText, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../lib/constants";
import { useAppStore } from "../store/useAppStore";

type FolderKind = "overview" | "chats" | "memory";

export function FilesPage() {
  const user = useAppStore((state) => state.user);
  const language = useAppStore((state) => state.settings.language);
  const exams = useAppStore((state) => state.exams).filter((exam) => !exam.deletedAt);
  const chats = useAppStore((state) => state.chats).filter((chat) => !chat.deletedAt);
  const memories = useAppStore((state) => state.memories).filter((memory) => !memory.deletedAt);
  const addMemory = useAppStore((state) => state.addMemory);
  const removeMemory = useAppStore((state) => state.removeMemory);
  const removeChat = useAppStore((state) => state.removeChat);
  const isOfflineReadOnly = useAppStore((state) => state.authMode === "offline-readonly");
  const [selectedExamId, setSelectedExamId] = useState(exams[0]?.id ?? "");
  const [folder, setFolder] = useState<FolderKind>("overview");
  const [memoryTitle, setMemoryTitle] = useState("");
  const [memoryContent, setMemoryContent] = useState("");

  const username = user?.fullName?.trim() || user?.email?.split("@")[0] || (language === "en" ? "User" : "Benutzer");
  const selectedExam = exams.find((exam) => exam.id === selectedExamId) ?? exams[0];
  const selectedChats = useMemo(() => chats.filter((chat) => chat.examId === selectedExam?.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [chats, selectedExam?.id]);
  const selectedMemories = useMemo(() => memories.filter((memory) => memory.examId === selectedExam?.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [memories, selectedExam?.id]);

  const selectExam = (examId: string) => {
    setSelectedExamId(examId);
    setFolder("overview");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <aside className="surface-card self-start p-4 lg:sticky lg:top-28">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-100 px-3 py-3 dark:bg-slate-950">
          <FolderOpen className="text-teal-600 dark:text-teal-300" size={20} aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{username}</p>
            <p className="text-xs text-slate-500">{language === "en" ? "My study files" : "Meine Lernablage"}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2 px-2 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Folder size={17} className="text-orange-500" aria-hidden="true" />
            {language === "en" ? "Subjects" : "Fächer"}
          </div>
          <div className="ml-3 border-l border-slate-200 pl-3 dark:border-slate-700">
            {exams.map((exam, index) => {
              const active = selectedExam?.id === exam.id;
              return (
                <div key={exam.id} className="py-1">
                  <button type="button" onClick={() => selectExam(exam.id)} className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm ${active ? "bg-teal-50 font-semibold text-teal-800 dark:bg-teal-500/10 dark:text-teal-200" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                    {active ? <FolderOpen size={16} aria-hidden="true" /> : <Folder size={16} aria-hidden="true" />}
                    <span className="truncate">KA{index + 1} · {exam.subject}</span>
                  </button>
                  {active ? (
                    <div className="ml-4 mt-1 grid gap-1 border-l border-slate-200 pl-2 dark:border-slate-700">
                      <button type="button" onClick={() => setFolder("chats")} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${folder === "chats" ? "bg-slate-950 text-white dark:bg-teal-500 dark:text-slate-950" : "text-slate-500"}`}>
                        <Folder size={14} /> Chats <span className="ml-auto">{selectedChats.length}</span>
                      </button>
                      <button type="button" onClick={() => setFolder("memory")} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${folder === "memory" ? "bg-slate-950 text-white dark:bg-teal-500 dark:text-slate-950" : "text-slate-500"}`}>
                        <Folder size={14} /> Memory <span className="ml-auto">{selectedMemories.length}</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-500" aria-label={language === "en" ? "Current path" : "Aktueller Pfad"}>
          <button type="button" onClick={() => setFolder("overview")} className="font-semibold text-slate-700 dark:text-slate-200">{username}</button>
          <ChevronRight size={14} />
          <span>{language === "en" ? "Subjects" : "Fächer"}</span>
          {selectedExam ? <><ChevronRight size={14} /><button type="button" onClick={() => setFolder("overview")} className="font-semibold text-slate-700 dark:text-slate-200">{selectedExam.subject}</button></> : null}
          {folder !== "overview" ? <><ChevronRight size={14} /><span className="font-semibold text-teal-700 dark:text-teal-300">{folder === "chats" ? "Chats" : "Memory"}</span></> : null}
        </div>

        {!selectedExam ? (
          <div className="surface-card p-8 text-center">
            <FolderOpen className="mx-auto text-slate-300" size={40} />
            <h3 className="mt-4 font-display text-2xl text-slate-950 dark:text-white">{language === "en" ? "No subject folders yet" : "Noch keine Fachordner"}</h3>
            <p className="mt-2 text-sm text-slate-500">{language === "en" ? "Create an exam to generate its Chats and Memory folders." : "Lege eine Klausur an, damit die Ordner Chats und Memory erstellt werden."}</p>
            <Link to={ROUTES.exams} className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950">{language === "en" ? "Create exam" : "Klausur anlegen"}</Link>
          </div>
        ) : folder === "overview" ? (
          <div>
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">KA · {selectedExam.date}</p>
              <h3 className="mt-2 font-display text-3xl text-slate-950 dark:text-white">{selectedExam.subject}</h3>
              <p className="mt-2 text-sm text-slate-500">{language === "en" ? "Everything the coach remembers for this exam is organized here." : "Hier ist alles geordnet, was der Coach zu dieser Klausur speichert."}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <button type="button" onClick={() => setFolder("chats")} className="surface-card group p-6 text-left transition hover:-translate-y-0.5 hover:border-teal-300">
                <div className="flex items-center justify-between"><FolderOpen className="text-teal-600" size={28} /><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800">{selectedChats.length}</span></div>
                <h4 className="mt-5 font-display text-2xl text-slate-950 dark:text-white">Chats</h4>
                <p className="mt-2 text-sm text-slate-500">{language === "en" ? "Saved conversations, quizzes, and explanations." : "Gespeicherte Gespräche, Quizze und Erklärungen."}</p>
              </button>
              <button type="button" onClick={() => setFolder("memory")} className="surface-card group p-6 text-left transition hover:-translate-y-0.5 hover:border-orange-300">
                <div className="flex items-center justify-between"><FolderOpen className="text-orange-500" size={28} /><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800">{selectedMemories.length}</span></div>
                <h4 className="mt-5 font-display text-2xl text-slate-950 dark:text-white">Memory</h4>
                <p className="mt-2 text-sm text-slate-500">{language === "en" ? "Facts, learning goals, and notes to remember." : "Fakten, Lernziele und Notizen, die erhalten bleiben sollen."}</p>
              </button>
            </div>
          </div>
        ) : folder === "chats" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-display text-3xl text-slate-950 dark:text-white">Chats</h3><p className="mt-1 text-sm text-slate-500">{selectedExam.subject}</p></div><Link to={`${ROUTES.coach}?exam=${selectedExam.id}`} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950"><Plus size={16} />{language === "en" ? "New chat" : "Neuer Chat"}</Link></div>
            {selectedChats.length ? selectedChats.map((chat) => (
              <article key={chat.id} className="surface-card flex items-start gap-4 p-5">
                <MessageSquareText className="mt-1 shrink-0 text-teal-600" size={21} />
                <Link to={`${ROUTES.coach}?chat=${chat.id}`} className="min-w-0 flex-1"><h4 className="truncate font-semibold text-slate-950 dark:text-white">{chat.title}</h4><p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{chat.mode} · {new Date(chat.updatedAt).toLocaleString()}</p><p className="mt-2 line-clamp-2 text-sm text-slate-500">{chat.messages.at(-1)?.content}</p></Link>
                <button type="button" disabled={isOfflineReadOnly} onClick={() => removeChat(chat.id)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40" aria-label={language === "en" ? "Delete chat" : "Chat löschen"}><Trash2 size={16} /></button>
              </article>
            )) : <p className="surface-card p-6 text-sm text-slate-500">{language === "en" ? "No saved chats for this exam yet." : "Für diese Klausur gibt es noch keine gespeicherten Chats."}</p>}
          </div>
        ) : (
          <div className="space-y-5">
            <div><h3 className="font-display text-3xl text-slate-950 dark:text-white">Memory</h3><p className="mt-1 text-sm text-slate-500">{selectedExam.subject}</p></div>
            <form className="surface-card p-5" onSubmit={(event) => { event.preventDefault(); if (!memoryContent.trim()) return; addMemory({ examId: selectedExam.id, title: memoryTitle, content: memoryContent.trim() }); setMemoryTitle(""); setMemoryContent(""); }}>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">{language === "en" ? "Add something to remember" : "Zum Memory hinzufügen"}</p>
              <input value={memoryTitle} onChange={(event) => setMemoryTitle(event.target.value)} placeholder={language === "en" ? "Title (optional)" : "Titel (optional)"} className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
              <textarea required value={memoryContent} onChange={(event) => setMemoryContent(event.target.value)} placeholder={language === "en" ? "Formula, learning goal, common mistake…" : "Formel, Lernziel, häufiger Fehler…"} className="mt-3 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
              <button type="submit" disabled={isOfflineReadOnly || !memoryContent.trim()} className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-teal-500 dark:text-slate-950"><Plus size={16} />{language === "en" ? "Save note" : "Notiz speichern"}</button>
            </form>
            <div className="grid gap-4 md:grid-cols-2">
              {selectedMemories.map((memory) => <article key={memory.id} className="surface-card p-5"><div className="flex items-start gap-3"><FileText className="mt-0.5 shrink-0 text-orange-500" size={19} /><div className="min-w-0 flex-1"><h4 className="font-semibold text-slate-950 dark:text-white">{memory.title}</h4><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{memory.content}</p></div><button type="button" disabled={isOfflineReadOnly} onClick={() => removeMemory(memory.id)} className="text-slate-400 hover:text-rose-600 disabled:opacity-40" aria-label={language === "en" ? "Delete memory" : "Memory löschen"}><Trash2 size={16} /></button></div></article>)}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
