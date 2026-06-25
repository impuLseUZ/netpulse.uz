/**
 * SftpBrowser — двухпанельный файловый менеджер (Модуль 8.2).
 *
 * Левая панель  — локальная файловая система (ваш компьютер)
 * Правая панель — удалённая файловая система через SFTP
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Folder, File, ChevronLeft, ChevronRight, ArrowUp,
  Search, FolderPlus, Pencil, Trash2, Loader,
  AlertCircle, Home, ChevronDown, ArrowRightToLine,
  ArrowLeftToLine, X, Check, HardDrive, RefreshCw,
} from 'lucide-react'
import type { SftpEntry, SftpProgressEvent, LocalEntry } from '@shared/ssh-types'

interface Props {
  sessionId: string
  serverLabel: string
  active: boolean
}

// ── Утилиты ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number, isDir = false): string {
  if (isDir) return '--'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i]
}

function formatDate(ms: number): string {
  if (!ms) return '--'
  const d = new Date(ms)
  return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ',\n' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

type SortField = 'name' | 'size' | 'date'
type SortDir   = 'asc' | 'desc'
type PanelEntry = (SftpEntry | LocalEntry)

function sortEntries<T extends { name: string; size: number; modifiedAt: number; isDirectory: boolean }>(
  list: T[], field: SortField, dir: SortDir
): T[] {
  return [...list].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    let cmp = 0
    if (field === 'name') cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    else if (field === 'size') cmp = a.size - b.size
    else cmp = a.modifiedAt - b.modifiedAt
    return dir === 'asc' ? cmp : -cmp
  })
}

// ── Иконка файла ─────────────────────────────────────────────────────────────

function FileIcon({ name, isDirectory }: { name: string; isDirectory: boolean }): JSX.Element {
  if (isDirectory) return <Folder size={14} className="text-[#4d9de0] shrink-0" />
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['zip','gz','tar','7z','rar'].includes(ext))
    return <File size={14} className="text-yellow-500 shrink-0" />
  if (['jpg','jpeg','png','gif','svg','webp'].includes(ext))
    return <File size={14} className="text-pink-400 shrink-0" />
  if (['mp4','mkv','avi','mov'].includes(ext))
    return <File size={14} className="text-purple-400 shrink-0" />
  if (['js','ts','tsx','jsx','py','go','rs','sh','php'].includes(ext))
    return <File size={14} className="text-ok shrink-0" />
  if (['exe','msi'].includes(ext))
    return <File size={14} className="text-orange-400 shrink-0" />
  return <File size={14} className="text-muted/70 shrink-0" />
}

// ── Actions dropdown ──────────────────────────────────────────────────────────

function ActionsMenu({ showHidden, onToggleHidden, onRefresh, onMkdir, onRename, onDelete, hasSelection, onClose }: {
  showHidden: boolean; onToggleHidden: () => void; onRefresh: () => void
  onMkdir: () => void; onRename: () => void; onDelete: () => void
  hasSelection: boolean; onClose: () => void
}): JSX.Element {
  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger = false, disabled = false): JSX.Element => (
    <button onClick={() => { onClick(); onClose() }} disabled={disabled}
      className={[
        'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors disabled:opacity-40',
        danger ? 'text-danger hover:bg-danger/10' : 'text-fg hover:bg-surface-2',
      ].join(' ')}>
      {icon}{label}
    </button>
  )
  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-surface border border-border rounded-lg shadow-xl py-1 overflow-hidden">
      <button onClick={() => { onToggleHidden(); onClose() }}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-fg hover:bg-surface-2 transition-colors">
        <span>{showHidden ? 'Скрыть скрытые файлы' : 'Показать скрытые файлы'}</span>
        {showHidden && <Check size={13} className="text-accent" />}
      </button>
      <div className="h-px bg-border my-1 mx-2" />
      {item(<RefreshCw size={13} className="text-muted" />, 'Обновить', onRefresh)}
      {item(<FolderPlus size={13} className="text-muted" />, 'Новая папка', onMkdir)}
      <div className="h-px bg-border my-1 mx-2" />
      {item(<Pencil size={13} className="text-muted" />, 'Переименовать', onRename, false, !hasSelection)}
      {item(<Trash2 size={13} />, 'Удалить', onDelete, true, !hasSelection)}
    </div>
  )
}

// ── Inline input ──────────────────────────────────────────────────────────────

function InlineInput({ placeholder, defaultValue = '', onConfirm, onCancel }: {
  placeholder: string; defaultValue?: string
  onConfirm: (v: string) => void; onCancel: () => void
}): JSX.Element {
  const [val, setVal] = useState(defaultValue)
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border-t border-border shrink-0">
      <input autoFocus
        className="flex-1 bg-bg border border-border rounded px-2 py-1 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent"
        placeholder={placeholder} value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && val.trim()) onConfirm(val.trim()); if (e.key === 'Escape') onCancel() }}
      />
      <button onClick={() => val.trim() && onConfirm(val.trim())} className="px-2.5 py-1 text-xs rounded bg-accent text-accent-fg">OK</button>
      <button onClick={onCancel} className="px-2.5 py-1 text-xs rounded border border-border text-muted hover:text-fg">✕</button>
    </div>
  )
}

// ── Панель ────────────────────────────────────────────────────────────────────

interface PanelProps {
  title: string
  path: string
  entries: PanelEntry[]
  loading: boolean
  error: string | null
  selected: PanelEntry | null
  search: string
  showHidden: boolean
  sortField: SortField
  sortDir: SortDir
  historyCanBack: boolean
  historyCanForward: boolean
  drives?: string[]
  inputMode: 'none' | 'mkdir' | 'rename'
  onNavigate: (p: string) => void
  onGoBack: () => void
  onGoForward: () => void
  onGoUp: () => void
  onGoHome: () => void
  onSelect: (e: PanelEntry | null) => void
  onSearchChange: (v: string) => void
  onSortChange: (f: SortField) => void
  onToggleHidden: () => void
  onRefresh: () => void
  onMkdir: () => void
  onRename: () => void
  onDelete: () => void
  onInputConfirm: (v: string) => void
  onInputCancel: () => void
}

function Panel(props: PanelProps): JSX.Element {
  const {
    title, path, entries, loading, error, selected, search,
    showHidden, sortField, sortDir, historyCanBack, historyCanForward,
    drives, inputMode,
    onNavigate, onGoBack, onGoForward, onGoUp, onGoHome, onSelect,
    onSearchChange, onSortChange, onToggleHidden, onRefresh,
    onMkdir, onRename, onDelete, onInputConfirm, onInputCancel,
  } = props

  const [showActions, setShowActions] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showActions) return
    const h = (e: MouseEvent): void => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setShowActions(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showActions])

  const filtered = entries.filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()))
  const sorted = sortEntries(filtered, sortField, sortDir)

  // Хлебные крошки
  const isWin = path.includes('\\') || /^[A-Z]:/.test(path)
  const sep = isWin ? '\\' : '/'
  const crumbs: { label: string; path: string }[] = [{ label: '/', path: '/' }]
  if (path !== '/') {
    const parts = path.split(/[\\/]/).filter(Boolean)
    parts.forEach((seg, i) => {
      const prev = crumbs[crumbs.length - 1].path
      const newPath = i === 0 && /^[A-Z]:$/.test(seg)
        ? seg + sep
        : (prev === '/' ? '' : prev).replace(/[\\/]$/, '') + sep + seg
      crumbs.push({ label: seg, path: newPath })
    })
  }

  const thBtn = (label: string, field: SortField, align: string): JSX.Element => (
    <button onClick={() => onSortChange(field)}
      className={`px-3 py-1.5 text-left text-[11px] font-semibold text-muted uppercase tracking-wider hover:text-fg transition-colors ${align}`}>
      {label}
      {sortField === field && <span className="ml-0.5 text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </button>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 border-r border-border last:border-r-0">

      {/* Заголовок */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-accent">{title.slice(0, 2).toUpperCase()}</span>
          </div>
          <span className="text-sm font-semibold text-fg truncate">{title}</span>
        </div>

        {/* Поиск */}
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input value={search} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск…"
            className="w-32 pl-6 pr-6 py-1 text-xs bg-bg border border-border rounded-md text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent" />
          {search && (
            <button onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-fg">
              <X size={11} />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="relative" ref={actionsRef}>
          <button onClick={() => setShowActions((v) => !v)}
            className={[
              'flex items-center gap-1 px-2.5 py-1 rounded text-xs border transition-colors',
              showActions ? 'bg-accent text-accent-fg border-accent' : 'border-border text-muted hover:text-fg',
            ].join(' ')}>
            Actions
            <ChevronDown size={11} className={showActions ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          {showActions && (
            <ActionsMenu showHidden={showHidden} onToggleHidden={onToggleHidden}
              onRefresh={onRefresh} onMkdir={onMkdir} onRename={onRename}
              onDelete={onDelete} hasSelection={!!selected}
              onClose={() => setShowActions(false)} />
          )}
        </div>
      </div>

      {/* Навигация */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-surface/50 border-b border-border shrink-0">
        <button onClick={onGoBack} disabled={!historyCanBack} title="Назад"
          className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 transition-colors">
          <ChevronLeft size={14} className="text-muted" />
        </button>
        <button onClick={onGoForward} disabled={!historyCanForward} title="Вперёд"
          className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 transition-colors">
          <ChevronRight size={14} className="text-muted" />
        </button>
        <button onClick={onGoUp} disabled={path === '/'} title="Вверх"
          className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 transition-colors">
          <ArrowUp size={14} className="text-muted" />
        </button>
        <button onClick={onGoHome} title="Домой"
          className="p-1 rounded hover:bg-surface-2 transition-colors">
          <Home size={13} className="text-muted" />
        </button>

        {/* Хлебные крошки */}
        <div className="flex items-center flex-1 min-w-0 overflow-x-auto ml-1 gap-0">
          {/* Windows: диски при пути "/" */}
          {drives && path === '/' ? (
            drives.map((d) => (
              <button key={d} onClick={() => onNavigate(d)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-muted hover:text-fg hover:bg-surface-2 shrink-0 whitespace-nowrap">
                <HardDrive size={11} />{d}
              </button>
            ))
          ) : (
            crumbs.map((crumb, idx) => (
              <div key={crumb.path + idx} className="flex items-center shrink-0">
                {idx > 0 && <ChevronRight size={11} className="text-muted/40 mx-0.5" />}
                <button onClick={() => idx < crumbs.length - 1 && onNavigate(crumb.path)}
                  className={[
                    'px-1 py-0.5 rounded text-xs transition-colors whitespace-nowrap',
                    idx === crumbs.length - 1
                      ? 'text-fg font-medium cursor-default'
                      : 'text-muted hover:text-fg hover:bg-surface-2 cursor-pointer',
                  ].join(' ')}>
                  {idx === 0 ? <Home size={11} /> : crumb.label}
                </button>
              </div>
            ))
          )}
        </div>

        {loading && <Loader size={12} className="text-accent animate-spin shrink-0 ml-1" />}
      </div>

      {/* Заголовки колонок */}
      <div className="grid grid-cols-[1fr_110px_75px_65px] bg-surface border-b border-border shrink-0">
        {thBtn('Имя ↕', 'name', '')}
        {thBtn('Дата изменения', 'date', 'text-right')}
        {thBtn('Размер', 'size', 'text-right')}
        {thBtn('Тип', 'name', '')}
      </div>

      {/* Файлы */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-danger bg-danger/10 border-b border-danger/20 shrink-0">
            <AlertCircle size={12} className="shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}
        {!loading && !error && sorted.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted">
            {search ? 'Ничего не найдено' : 'Папка пуста'}
          </div>
        )}
        {sorted.map((entry) => {
          const isSelected = selected?.path === entry.path
          const kind = 'kind' in entry ? (entry as LocalEntry).kind : entry.isDirectory ? 'folder' : 'file'
          return (
            <div key={entry.path}
              onClick={() => onSelect(isSelected ? null : entry)}
              onDoubleClick={() => { if (entry.isDirectory) onNavigate(entry.path) }}
              className={[
                'grid grid-cols-[1fr_110px_75px_65px] items-center cursor-pointer select-none',
                'border-b border-border/20 transition-colors text-[12px]',
                isSelected ? 'bg-accent/15 hover:bg-accent/20' : 'hover:bg-surface-2/50',
              ].join(' ')}>
              <div className="flex items-center gap-2 px-3 py-1.5 min-w-0">
                <FileIcon name={entry.name} isDirectory={entry.isDirectory} />
                <span className={[
                  'truncate',
                  entry.isDirectory ? 'text-fg font-medium' : 'text-fg/90',
                  entry.name.startsWith('.') ? 'opacity-50' : '',
                ].join(' ')}>{entry.name}</span>
              </div>
              <div className="px-2 py-1.5 text-right text-muted text-[11px] whitespace-pre-line leading-tight">
                {formatDate(entry.modifiedAt)}
              </div>
              <div className="px-2 py-1.5 text-right text-muted font-mono text-[11px]">
                {formatSize(entry.size, entry.isDirectory)}
              </div>
              <div className="px-3 py-1.5 text-muted text-[11px]">{kind}</div>
            </div>
          )
        })}
      </div>

      {/* Inline input */}
      {inputMode === 'mkdir' && (
        <InlineInput placeholder="Название папки" onConfirm={onInputConfirm} onCancel={onInputCancel} />
      )}
      {inputMode === 'rename' && selected && (
        <InlineInput placeholder={selected.name} defaultValue={selected.name}
          onConfirm={onInputConfirm} onCancel={onInputCancel} />
      )}

      {/* Статус */}
      <div className="shrink-0 px-3 py-1 border-t border-border bg-surface/50 flex items-center gap-2 text-[10px] text-muted">
        <span>{sorted.length} элем.</span>
        {selected && (
          <><span className="text-border">·</span>
            <span className="truncate max-w-[100px]">{selected.name}</span>
            {!selected.isDirectory && (
              <><span className="text-border">·</span><span>{formatSize(selected.size)}</span></>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Прогресс ──────────────────────────────────────────────────────────────────

function TransferBar({ items }: { items: (SftpProgressEvent & { done: boolean })[] }): JSX.Element | null {
  const active = items.filter((i) => !i.done)
  if (active.length === 0) return null
  return (
    <div className="shrink-0 border-t border-border bg-surface px-3 py-2 space-y-1.5">
      {active.map((item) => {
        const pct = item.total > 0 ? Math.round((item.transferred / item.total) * 100) : 0
        return (
          <div key={item.transferId} className="flex items-center gap-2 text-[11px]">
            <span className="text-accent font-mono w-3">{item.direction === 'download' ? '↓' : '↑'}</span>
            <span className="truncate flex-1 text-fg">{item.filename}</span>
            <span className="text-muted shrink-0">{pct}%</span>
            <div className="w-20 h-1 bg-surface-2 rounded-full overflow-hidden shrink-0">
              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Хук панели ────────────────────────────────────────────────────────────────

function usePanelState(startPath: string) {
  const [path, setPath]           = useState(startPath)
  const [entries, setEntries]     = useState<PanelEntry[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [selected, setSelected]   = useState<PanelEntry | null>(null)
  const [search, setSearch]       = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir]     = useState<SortDir>('asc')
  const [history, setHistory]     = useState<string[]>([startPath])
  const [histIdx, setHistIdx]     = useState(0)
  const [inputMode, setInputMode] = useState<'none' | 'mkdir' | 'rename'>('none')
  const [drives, setDrives]       = useState<string[] | undefined>()

  const navigateTo = useCallback((p: string) => {
    setPath(p)
    setSelected(null)
    setSearch('')
    setInputMode('none')
    setError(null)
    setHistory((h) => {
      const next = [...h.slice(0, histIdx + 1), p]
      setHistIdx(next.length - 1)
      return next
    })
  }, [histIdx])

  const goBack = useCallback(() => {
    setHistIdx((i) => {
      if (i <= 0) return i
      const ni = i - 1
      setPath((prev) => { void prev; return history[ni] })
      setSelected(null)
      return ni
    })
  }, [history])

  const goForward = useCallback(() => {
    setHistIdx((i) => {
      if (i >= history.length - 1) return i
      const ni = i + 1
      setPath(history[ni])
      setSelected(null)
      return ni
    })
  }, [history])

  const goUp = useCallback(() => {
    setPath((p) => {
      if (p === '/') return p
      if (/^[A-Z]:[/\\]?$/.test(p)) { navigateTo('/'); return p }
      const sep = p.includes('\\') ? '\\' : '/'
      const parent = p.replace(new RegExp(`[${sep === '\\' ? '\\\\' : '/'}][^${sep === '\\' ? '\\\\' : '/'}]+[${sep === '\\' ? '\\\\' : '/'}]?$`), '') || '/'
      navigateTo(parent)
      return p
    })
  }, [navigateTo])

  const toggleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
      else { setSortDir('asc') }
      return field
    })
  }, [])

  return {
    path, entries, setEntries, loading, setLoading,
    error, setError, selected, setSelected, search, setSearch,
    showHidden, setShowHidden, sortField, sortDir, toggleSort,
    historyCanBack: histIdx > 0, historyCanForward: histIdx < history.length - 1,
    navigateTo, goBack, goForward, goUp,
    inputMode, setInputMode, drives, setDrives,
  }
}

// ── Основной компонент ────────────────────────────────────────────────────────

export function SftpBrowser({ sessionId, serverLabel, active }: Props): JSX.Element {
  const { t } = useTranslation()

  // Стартовый путь локали: на Windows начинаем с "/" (покажем диски),
  // на Unix — домашняя директория (загрузится через getHome:true)
  const localStartPath = '/'
  const local  = usePanelState(localStartPath)
  const remote = usePanelState('/')

  const [sftpStatus, setSftpStatus] = useState<'idle' | 'opening' | 'ready' | 'error'>('idle')
  const [sftpError,  setSftpError]  = useState<string | null>(null)
  const [transfers, setTransfers]   = useState<Map<string, SftpProgressEvent & { done: boolean }>>(new Map())
  const unsubRef = useRef<(() => void) | null>(null)

  // Ref-копии для использования в колбэках без stale closure
  const localShowHiddenRef  = useRef(local.showHidden)
  const remoteShowHiddenRef = useRef(remote.showHidden)
  localShowHiddenRef.current  = local.showHidden
  remoteShowHiddenRef.current = remote.showHidden

  // ── SFTP ──────────────────────────────────────────────────────────────────

  const openSftp = useCallback(async () => {
    setSftpStatus('opening')
    const res = await window.netpulse.sftp.open(sessionId)
    if (!res.ok) { setSftpStatus('error'); setSftpError(res.error.message); return }
    setSftpStatus('ready')
    if (unsubRef.current) unsubRef.current()
    unsubRef.current = window.netpulse.sftp.onProgress((ev: SftpProgressEvent) => {
      if (ev.sessionId !== sessionId) return
      const done = ev.transferred >= ev.total && ev.total > 0
      setTransfers((prev) => { const n = new Map(prev); n.set(ev.transferId, { ...ev, done }); return n })
      if (done) setTimeout(() => setTransfers((p) => { const n = new Map(p); n.delete(ev.transferId); return n }), 2000)
    })
  }, [sessionId])

  useEffect(() => {
    if (active && sftpStatus === 'idle') void openSftp()
    return () => { unsubRef.current?.() }
  }, [active, sftpStatus, openSftp])

  // ── Загрузка локальных файлов ─────────────────────────────────────────────

  const loadLocal = useCallback(async (p: string) => {
    local.setLoading(true)
    local.setError(null)
    try {
      const res = await window.netpulse.sftp.localList({
        localPath: p,
        showHidden: localShowHiddenRef.current,
        // На Unix при "/" грузим домашнюю директорию сразу
        getHome: p === '/' && !navigator.userAgent.includes('Win') ? true : undefined,
      } as Parameters<typeof window.netpulse.sftp.localList>[0])
      if (res.ok) {
        local.setEntries(res.data.entries as PanelEntry[])
        if (res.data.drives) local.setDrives(res.data.drives)
        // Если вернули домашнюю — обновим путь
        if (res.data.path && res.data.path !== p) local.navigateTo(res.data.path)
      } else {
        local.setError(res.error.message)
      }
    } catch (err) {
      local.setError((err as Error).message)
    }
    local.setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // intentionally empty deps — we use refs for showHidden

  // ── Загрузка удалённых файлов ─────────────────────────────────────────────

  const loadRemote = useCallback(async (p: string) => {
    remote.setLoading(true)
    remote.setError(null)
    try {
      const res = await window.netpulse.sftp.list({ sessionId, remotePath: p })
      if (res.ok) remote.setEntries(res.data.entries as PanelEntry[])
      else remote.setError(res.error.message)
    } catch (err) {
      remote.setError((err as Error).message)
    }
    remote.setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // ── Эффекты навигации ─────────────────────────────────────────────────────

  // local.path изменился → перезагружаем
  const localPathRef = useRef(local.path)
  useEffect(() => {
    if (localPathRef.current === local.path && local.entries.length > 0) return
    localPathRef.current = local.path
    void loadLocal(local.path)
  }, [local.path, loadLocal])

  // showHidden изменилось → перезагружаем текущую директорию
  const localHiddenRef = useRef(local.showHidden)
  useEffect(() => {
    if (localHiddenRef.current === local.showHidden) return
    localHiddenRef.current = local.showHidden
    void loadLocal(local.path)
  }, [local.showHidden, local.path, loadLocal])

  // remote.path изменился
  const remotePathRef = useRef(remote.path)
  useEffect(() => {
    if (sftpStatus !== 'ready') return
    if (remotePathRef.current === remote.path && remote.entries.length > 0) return
    remotePathRef.current = remote.path
    void loadRemote(remote.path)
  }, [remote.path, sftpStatus, loadRemote])

  // SFTP готов → первая загрузка remote
  const sftpReadyFired = useRef(false)
  useEffect(() => {
    if (sftpStatus !== 'ready' || sftpReadyFired.current) return
    sftpReadyFired.current = true
    void loadRemote('/')
  }, [sftpStatus, loadRemote])

  // showHidden remote изменилось
  const remoteHiddenRef = useRef(remote.showHidden)
  useEffect(() => {
    if (remoteHiddenRef.current === remote.showHidden) return
    remoteHiddenRef.current = remote.showHidden
    if (sftpStatus === 'ready') void loadRemote(remote.path)
  }, [remote.showHidden, remote.path, sftpStatus, loadRemote])

  // Initial mount: загружаем локальную
  const mountedRef = useRef(false)
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    void loadLocal('/')
  }, [loadLocal])

  // ── Операции remote ───────────────────────────────────────────────────────

  const handleRemoteMkdir = async (name: string): Promise<void> => {
    const p = remote.path.replace(/\/$/, '') + '/' + name
    const res = await window.netpulse.sftp.mkdir({ sessionId, remotePath: p })
    if (!res.ok) remote.setError(res.error.message)
    remote.setInputMode('none')
    void loadRemote(remote.path)
  }

  const handleRemoteRename = async (newName: string): Promise<void> => {
    if (!remote.selected) return
    const dir = remote.selected.path.replace(/\/[^/]+$/, '') || '/'
    const newPath = dir.replace(/\/$/, '') + '/' + newName
    const res = await window.netpulse.sftp.rename({ sessionId, oldPath: remote.selected.path, newPath })
    if (!res.ok) remote.setError(res.error.message)
    remote.setInputMode('none')
    remote.setSelected(null)
    void loadRemote(remote.path)
  }

  const handleRemoteDelete = async (): Promise<void> => {
    if (!remote.selected) return
    const res = await window.netpulse.sftp.delete({
      sessionId, remotePath: remote.selected.path, isDirectory: remote.selected.isDirectory,
    })
    if (!res.ok) remote.setError(res.error.message)
    remote.setSelected(null)
    void loadRemote(remote.path)
  }

  // ── Передача ──────────────────────────────────────────────────────────────

  const transferToRemote = async (): Promise<void> => {
    if (!local.selected || local.selected.isDirectory) return
    const res = await window.netpulse.sftp.transferToRemote({
      sessionId, localPath: local.selected.path, remotePath: remote.path, direction: 'upload',
    })
    if (!res.ok) remote.setError(res.error.message)
    else void loadRemote(remote.path)
  }

  const transferToLocal = async (): Promise<void> => {
    if (!remote.selected || remote.selected.isDirectory) return
    const res = await window.netpulse.sftp.transferToLocal({
      sessionId, localPath: local.path, remotePath: remote.selected.path, direction: 'download',
    })
    if (!res.ok) local.setError(res.error.message)
    else void loadLocal(local.path)
  }

  // ── Статусы ───────────────────────────────────────────────────────────────

  if (sftpStatus === 'opening') {
    return (
      <div className="h-full flex items-center justify-center gap-3 text-muted">
        <Loader size={20} className="animate-spin text-accent" />
        <span className="text-sm">{t('sftp.opening')}</span>
      </div>
    )
  }
  if (sftpStatus === 'error') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8">
        <AlertCircle size={28} className="text-danger" />
        <p className="text-sm font-medium text-fg">{t('sftp.errorOpen')}</p>
        <p className="text-xs text-muted">{sftpError}</p>
        <button onClick={() => { setSftpStatus('idle'); setSftpError(null) }}
          className="mt-2 px-4 py-2 text-sm rounded-lg bg-accent text-accent-fg hover:opacity-90">
          {t('sftp.retry')}
        </button>
      </div>
    )
  }

  const activeTransfers = [...transfers.values()]

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg">
      <div className="flex-1 flex overflow-hidden">

        {/* Левая: Local */}
        <Panel
          title="Local"
          path={local.path}
          entries={local.entries}
          loading={local.loading}
          error={local.error}
          selected={local.selected}
          search={local.search}
          showHidden={local.showHidden}
          sortField={local.sortField}
          sortDir={local.sortDir}
          historyCanBack={local.historyCanBack}
          historyCanForward={local.historyCanForward}
          drives={local.drives}
          inputMode={local.inputMode}
          onNavigate={local.navigateTo}
          onGoBack={local.goBack}
          onGoForward={local.goForward}
          onGoUp={local.goUp}
          onGoHome={() => void loadLocal('/')}
          onSelect={local.setSelected}
          onSearchChange={local.setSearch}
          onSortChange={local.toggleSort}
          onToggleHidden={() => local.setShowHidden((v) => !v)}
          onRefresh={() => void loadLocal(local.path)}
          onMkdir={() => local.setInputMode('mkdir')}
          onRename={() => local.selected && local.setInputMode('rename')}
          onDelete={() => { /* TODO: local delete */ }}
          onInputConfirm={() => local.setInputMode('none')}
          onInputCancel={() => local.setInputMode('none')}
        />

        {/* Кнопки передачи */}
        <div className="flex flex-col items-center justify-center gap-2 px-1 bg-surface border-x border-border shrink-0 w-9">
          <button onClick={() => void transferToRemote()}
            disabled={!local.selected || local.selected.isDirectory}
            title="Загрузить на сервер"
            className={[
              'w-7 h-7 rounded-full border flex items-center justify-center transition-colors',
              local.selected && !local.selected.isDirectory
                ? 'border-accent bg-accent/10 text-accent hover:bg-accent hover:text-accent-fg'
                : 'border-border text-muted/30 cursor-not-allowed',
            ].join(' ')}>
            <ArrowRightToLine size={13} />
          </button>
          <button onClick={() => void transferToLocal()}
            disabled={!remote.selected || remote.selected.isDirectory}
            title="Скачать на компьютер"
            className={[
              'w-7 h-7 rounded-full border flex items-center justify-center transition-colors',
              remote.selected && !remote.selected.isDirectory
                ? 'border-accent bg-accent/10 text-accent hover:bg-accent hover:text-accent-fg'
                : 'border-border text-muted/30 cursor-not-allowed',
            ].join(' ')}>
            <ArrowLeftToLine size={13} />
          </button>
        </div>

        {/* Правая: Remote */}
        <Panel
          title={serverLabel}
          path={remote.path}
          entries={remote.entries}
          loading={remote.loading}
          error={remote.error}
          selected={remote.selected}
          search={remote.search}
          showHidden={remote.showHidden}
          sortField={remote.sortField}
          sortDir={remote.sortDir}
          historyCanBack={remote.historyCanBack}
          historyCanForward={remote.historyCanForward}
          inputMode={remote.inputMode}
          onNavigate={remote.navigateTo}
          onGoBack={remote.goBack}
          onGoForward={remote.goForward}
          onGoUp={remote.goUp}
          onGoHome={() => void loadRemote('/')}
          onSelect={remote.setSelected}
          onSearchChange={remote.setSearch}
          onSortChange={remote.toggleSort}
          onToggleHidden={() => remote.setShowHidden((v) => !v)}
          onRefresh={() => void loadRemote(remote.path)}
          onMkdir={() => remote.setInputMode('mkdir')}
          onRename={() => remote.selected && remote.setInputMode('rename')}
          onDelete={() => void handleRemoteDelete()}
          onInputConfirm={(v) => remote.inputMode === 'mkdir' ? void handleRemoteMkdir(v) : void handleRemoteRename(v)}
          onInputCancel={() => remote.setInputMode('none')}
        />
      </div>

      <TransferBar items={activeTransfers} />
    </div>
  )
}