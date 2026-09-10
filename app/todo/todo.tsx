"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Check, CheckCheck, ChevronRight, Circle, FileText, LoaderCircle, RotateCcw, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Toaster, toast } from "sonner";
import { type Task, type TaskInput } from "@/lib/todo/model";
import styles from "./todo.module.css";
import { draftStore, type DraftStore } from "@/lib/drafts";
type TodoDraft = { text: string; draftId: string; editor: Task | null };

function Hint({ label, children }: { label: string; children: React.ReactNode }) {
  return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}

export default function Todo() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const readVersion = useRef(0);
  const [tab, setTab] = useState("open");
  const [text, setText] = useState("");
  const [draftId, setDraftId] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const drafts = useRef<DraftStore<TodoDraft> | null>(null);
  const [draftsReady, setDraftsReady] = useState(false);
  const [draftNotice, setDraftNotice] = useState("");
  const [editorDraft, setEditorDraft] = useState<Task | null>(null);
  const [conflict, setConflict] = useState<Task | null>(null);
  const linkedTaskOpened = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void draftStore<TodoDraft>('todo').then(store => {
      if (cancelled) return;
      drafts.current = store;
      const recovered = store.read();
      if (recovered) { setText(recovered.text); setDraftId(recovered.draftId); setEditorDraft(recovered.editor); }
      setDraftsReady(true);
    }).catch(() => { if (!cancelled) { setDraftNotice('Draft recovery is unavailable. Keep this page open until saved.'); setDraftsReady(true); } });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!draftsReady || !drafts.current) return;
    if (!text && !editorDraft) drafts.current.clear();
    else if (!drafts.current.write({ text, draftId, editor: editorDraft })) setDraftNotice('Draft could not be kept on this device. Keep this page open until saved.');
  }, [text, draftId, editorDraft, draftsReady]);
  useEffect(() => {
    if (!ready || !draftsReady || linkedTaskOpened.current) return;
    linkedTaskOpened.current = true;
    const query = new URLSearchParams(window.location.search);
    if (query.has('add')) input.current?.focus();
    const task = tasks.find(t => t.id === query.get('task') && !t.deleted);
    if (task && !editorDraft) { setEditing(task); setConflict(null); }
  }, [ready, draftsReady, tasks, editorDraft]);

  function changeEditor(task: Task) { setEditing(task); setEditorDraft(task); }
  function finishEditor() { setEditing(null); setEditorDraft(null); setConflict(null); }

  const opener = useRef<HTMLButtonElement | null>(null);

  const refresh = useCallback(async () => {
    if (locked.current) return;
    const requestVersion = ++readVersion.current;
    try {
      const response = await fetch("/api/todo", { cache: "no-store" });
      const data = await response.json() as { tasks: Task[]; error?: string };
      if (requestVersion !== readVersion.current) return;
      if (!response.ok) throw new Error(data.error);
      setTasks(data.tasks); setReady(true); setError("");
    } catch (e) { if (requestVersion === readVersion.current) setError(e instanceof Error ? e.message : "Couldn't load tasks."); }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => { window.removeEventListener("focus", onFocus); window.removeEventListener("online", onFocus); };
  }, [refresh]);

  async function save(value: TaskInput): Promise<Task | null> {
    if (locked.current) return null;
    locked.current = true; setBusy(true);
    readVersion.current++;
    try {
      const { id, title, notes, done, deleted, version } = value;
      const response = await fetch("/api/todo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, title, notes, done, deleted, version }) });
      const data = await response.json() as { tasks?: Task[]; error?: string };
      if (data.tasks) setTasks(data.tasks);
      if (!response.ok) {
        if (response.status === 409 && editing?.id === id) setConflict(data.tasks?.find(task => task.id === id) ?? null);
        throw new Error(data.error);
      }
      setError("");
      return data.tasks?.find((task: Task) => task.id === id) ?? null;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save not confirmed. Try again.");
      return null;
    } finally { locked.current = false; setBusy(false); }
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy || !ready) return;
    const id = draftId || crypto.randomUUID();
    setDraftId(id);
    const task = await save({ id, title: text.trim(), notes: "", done: false, deleted: false, version: 0 });
    if (task) { setText(""); setDraftId(""); setTab("open"); input.current?.focus(); }
  }

  async function toggle(task: Task) {
    const result = await save({ ...task, done: !task.done });
    if (result && result.done) toast("Completed", { action: { label: "Undo", onClick: () => { void save({ ...result, done: false }); } } });
  }

  async function remove(task: Task) {
    const result = await save({ ...task, deleted: true });
    if (result) {
      finishEditor();
      toast("Deleted", { duration: 8000, action: { label: "Undo", onClick: () => { void save({ ...result, deleted: false }); } } });
    }
  }

  const open = tasks.filter(task => !task.deleted && !task.done);
  const done = tasks.filter(task => !task.deleted && task.done);

  function list(items: Task[], completed: boolean) {
    return <div className={styles.list}>
      {ready && items.length === 0 && <div className={styles.empty} role="status"><CheckCheck size={28} strokeWidth={1.5} /><span>{completed ? "No completed tasks" : "All clear"}</span></div>}
      {items.map(task => <div className={`${styles.row} ${task.done ? styles.done : ""}`} key={task.id}>
        <div className={styles.checkArea}><Checkbox className={styles.checkbox} aria-label={`${task.done ? "Reopen" : "Complete"}: ${task.title}`} checked={task.done} disabled={busy} onCheckedChange={() => void toggle(task)} /></div>
        <button className={styles.task} disabled={busy || !draftsReady || !!(editorDraft && editorDraft.id !== task.id)} onClick={event => { opener.current = event.currentTarget; setEditing(editorDraft?.id === task.id ? editorDraft : task); setConflict(null); }} aria-label={`Edit: ${task.title}`}>
          <span className={styles.taskTitle}>{task.title}</span>
          {task.notes && <FileText className={styles.noteIcon} size={16} aria-label="Has notes" />}
          <ChevronRight className={styles.chevron} size={18} aria-hidden="true" />
        </button>
      </div>)}
    </div>;
  }

  return <TooltipProvider delayDuration={350}>
    <main className={styles.workspace}>
      <header className={styles.header}>
        <h1>To-do</h1>
        {busy && <LoaderCircle className={styles.spinner} size={18} aria-label="Saving" />}
      </header>
      <Tabs value={tab} onValueChange={setTab} className={styles.tabs}>
        <div className={styles.toolbar}>
          <TabsList className={styles.tabList} aria-label="Task status">
            <Hint label="Open"><TabsTrigger value="open" aria-label={`Open tasks, ${open.length}`} className={styles.tab}><Circle size={18} /><span>Open</span><span>{ready ? open.length : "—"}</span></TabsTrigger></Hint>
            <Hint label="Completed"><TabsTrigger value="done" aria-label={`Completed tasks, ${done.length}`} className={styles.tab}><CheckCheck size={20} /><span>Done</span><span>{ready ? done.length : "—"}</span></TabsTrigger></Hint>
          </TabsList>
        </div>
        <form onSubmit={add} className={styles.capture}>
          <input ref={input} value={text} onChange={event => { setText(event.target.value); if (!event.target.value.trim()) setDraftId(""); }} placeholder="Add a task…" aria-label="New task" maxLength={240} autoComplete="off" enterKeyHint="done" disabled={busy || !draftsReady} />
          <Hint label="Add task"><button className={styles.add} type="submit" aria-label="Add task" disabled={!ready || !draftsReady || busy || !text.trim()}><ArrowUp size={21} /></button></Hint>
        </form>
        {draftNotice && <p className={styles.draftNotice} role="status">{draftNotice}</p>}
        {editorDraft && !editing && <div className={styles.draftNotice}><span>Unsaved changes: {editorDraft.title}</span><button onClick={() => { setEditing(editorDraft); setConflict(null); }}>Resume editing</button><button onClick={() => setEditorDraft(null)}>Discard draft</button></div>}
        {error && <div role="alert" className={styles.error}><span>{error}</span><button onClick={() => void refresh()} aria-label="Retry" title="Retry"><RotateCcw size={18} /></button></div>}
        {!ready && !error && <div className={styles.loading} role="status"><LoaderCircle className={styles.spinner} size={22} /><span className="sr-only">Loading tasks</span></div>}
        <TabsContent value="open">{list(open, false)}</TabsContent>
        <TabsContent value="done">{list(done, true)}</TabsContent>
      </Tabs>
    </main>
    <Sheet open={!!editing} onOpenChange={value => { if (!value && !busy) setEditing(null); }}>
      <SheetContent showCloseButton={false} className={styles.sheet} aria-describedby={undefined} onCloseAutoFocus={event => { event.preventDefault(); if (opener.current?.isConnected) opener.current.focus(); else input.current?.focus(); }}>
        {editing && <form className={styles.editor} onSubmit={async event => { event.preventDefault(); if (conflict) return; const result = await save(editing); if (result) finishEditor(); }}>
          <SheetTitle className="sr-only">Edit task</SheetTitle>
          <div className={styles.editorToolbar}>
            <Hint label="Close"><button type="button" disabled={busy} className={styles.iconButton} aria-label="Close" onClick={() => setEditing(null)}><X size={21} /></button></Hint>
            <Hint label="Delete"><button type="button" disabled={busy} className={`${styles.iconButton} ${styles.delete}`} aria-label="Delete task" onClick={() => void remove(editing)}><Trash2 size={20} /></button></Hint>
            <Hint label="Save"><button type="submit" disabled={busy || !!conflict || !editing.title.trim()} className={`${styles.iconButton} ${styles.save}`} aria-label="Save task">{busy ? <LoaderCircle className={styles.spinner} size={21} /> : <Check size={22} />}</button></Hint>
          </div>
          {conflict && <div className={styles.conflict} role="alert"><strong>This task changed elsewhere.</strong><p>Your draft is still below. The saved task is:</p><p>{conflict.title}{conflict.deleted ? ' (deleted)' : conflict.done ? ' (completed)' : ''}</p><pre>{conflict.notes}</pre><button type="button" onClick={() => { setEditing(conflict.deleted ? null : conflict); setEditorDraft(null); setConflict(null); }}>Use saved task</button>{!conflict.deleted && <button type="button" onClick={() => { changeEditor({ ...editing, done: conflict.done, deleted: conflict.deleted, version: conflict.version }); setConflict(null); }}>Keep my text for review</button>}</div>}
          <textarea className={styles.titleInput} aria-label="Task title" value={editing.title} maxLength={240} rows={3} required disabled={busy} onChange={event => changeEditor({ ...editing, title: event.target.value })} />
          <textarea className={styles.notesInput} aria-label="Task notes" placeholder="Notes…" value={editing.notes} maxLength={8000} disabled={busy} onChange={event => changeEditor({ ...editing, notes: event.target.value })} />
        </form>}
      </SheetContent>
    </Sheet>
    <Toaster position="bottom-center" richColors offset="90px" mobileOffset="90px" />
  </TooltipProvider>;
}
