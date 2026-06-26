/**
 * SftpBrowser — двухпанельный файловый менеджер с drag-and-drop (Модуль 8.2).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Folder, File, ChevronLeft, ChevronRight, ArrowUp,
  Search, FolderPlus, Pencil, Trash2, Loader,
  AlertCircle, Home, ChevronDown, ArrowRightToLine,
  ArrowLeftToLine, X, Check, HardDrive, RefreshCw,
  CheckCircle2, XCircle, Upload, Download,
} from 'lucide-react'
import type { SftpEntry, SftpProgressEvent, LocalEntry } from '@shared/ssh-types'

interface Props {
  sessionId: string
  serverLabel: string
  active: boolean
}

// ── Форматирование ────────────────────────────────────────────────────────────

function formatSize(bytes: number, isDir = false): string {
  if (isDir) return '--'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + '\u00a0' + units[i]
}

function formatSpeed(bps: number): string {
  if (bps <= 0) return '—'
  return formatSize(bps) + '/с'
}

function formatEta(sec: number): string {
  if (sec < 0 || !isFinite(sec)) return ''
  if (sec < 1) return '< 1 с'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  if (m === 0) return `${s} с`
  if (m < 60) return `${m} мин ${s} с`
  const h = Math.floor(m / 60)
  return `${h} ч ${m % 60} мин`
}

function formatDate(ms: number): string {
  if (!ms) return '--'
  const d = new Date(ms)
  return (
    d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ',\n' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  )
}

type SortField  = 'name' | 'size' | 'date'
type SortDir    = 'asc' | 'desc'
type PanelEntry = SftpEntry | LocalEntry

interface TransferState extends SftpProgressEvent {
  startedAt: number
}

function sortEntries<T extends { name: string; size: number; modifiedAt: number; isDirectory: boolean }>(
  list: T[], field: SortField, dir: SortDir
): T[] {
  return [...list].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    let cmp = 0
    if (field === 'name')      cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    else if (field === 'size') cmp = a.size - b.size
    else                       cmp = a.modifiedAt - b.modifiedAt
    return dir === 'asc' ? cmp : -cmp
  })
}

// ── Иконка файла ─────────────────────────────────────────────────────────────

function FileIcon({ name, isDirectory }: { name: string; isDirectory: boolean }): JSX.Element {
  if (isDirectory) return <Folder size={14} className="text-[#4d9de0] shrink-0" />
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['zip','gz','tar','7z','rar'].includes(ext)) return <File size={14} className="text-yellow-500 shrink-0" />
  if (['jpg','jpeg','png','gif','svg','webp'].includes(ext)) return <File size={14} className="text-pink-400 shrink-0" />
  if (['mp4','mkv','avi','mov'].includes(ext)) return <File size={14} className="text-purple-400 shrink-0" />
  if (['js','ts','tsx','jsx','py','go','rs','sh','php'].includes(ext)) return <File size={14} className="text-ok shrink-0" />
  if (['exe','msi'].includes(ext)) return <File size={14} className="text-orange-400 shrink-0" />
  return <File size={14} className="text-muted/70 shrink-0" />
}

// ── Панель прогресса (floating) ───────────────────────────────────────────────

function TransferPanel({ transfers, onDismiss }: {
  transfers: Map<string, TransferState>
  onDismiss: (id: string) => void
}): JSX.Element | null {
  const items = [...transfers.values()]
  if (items.length === 0) return null
  const active = items.filter((i) => i.status === 'active').length

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 border-t-2 border-accent/30 bg-surface/98 backdrop-blur-sm shadow-2xl">
      {/* Заголовок */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          {active > 0 && <Loader size={13} className="text-accent animate-spin" />}
          <span className="text-[12px] font-semibold text-fg">
            {active > 0 ? `Передача файлов (${active})` : 'Передача завершена'}
          </span>
        </div>
        <span className="text-[11px] text-muted">
          {items.filter((i) => i.status === 'done').length}/{items.length} завершено
        </span>
      </div>

      {/* Список */}
      <div className="max-h-48 overflow-y-auto">
        {items.map((item) => {
          const pct = item.total > 0 ? Math.min(100, Math.round((item.transferred / item.total) * 100)) : 0
          const isDone  = item.status === 'done'
          const isError = item.status === 'error'
          const isActive = item.status === 'active'

          return (
            <div key={item.transferId} className="px-4 py-2.5 border-b border-border/30 last:border-0">
              {/* Строка 1: иконка + имя + статус + кнопка закрыть */}
              <div className="flex items-center gap-2 mb-1.5">
                {item.direction === 'upload'
                  ? <Upload size={13} className="text-accent shrink-0" />
                  : <Download size={13} className="text-ok shrink-0" />}

                <span className="text-[12px] text-fg truncate flex-1 font-medium">{item.filename}</span>

                {isDone  && <CheckCircle2 size={14} className="text-ok shrink-0" />}
                {isError && <XCircle      size={14} className="text-danger shrink-0" />}

                {(isDone || isError) && (
                  <button onClick={() => onDismiss(item.transferId)}
                    className="text-muted hover:text-fg transition-colors ml-1">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Прогресс-бар */}
              <div className="h-1.5 bg-bg rounded-full overflow-hidden mb-1.5">
                <div
                  className={[
                    'h-full rounded-full transition-all duration-200',
                    isDone  ? 'bg-ok' :
                    isError ? 'bg-danger' : 'bg-accent',
                  ].join(' ')}
                  style={{ width: isDone ? '100%' : `${pct}%` }}
                />
              </div>

              {/* Строка 2: размеры + скорость + ETA */}
              <div className="flex items-center gap-3 text-[11px]">
                {/* Прогресс размера */}
                <span className="text-muted font-mono">
                  {isDone
                    ? formatSize(item.total)
                    : `${formatSize(item.transferred)} / ${formatSize(item.total)}`}
                </span>

                {/* % */}
                <span className={[
                  'font-mono font-semibold',
                  isDone ? 'text-ok' : isError ? 'text-danger' : 'text-accent',
                ].join(' ')}>
                  {isDone ? '100%' : isError ? 'Ошибка' : `${pct}%`}
                </span>

                {/* Скорость (только активные) */}
                {isActive && item.bytesPerSecond > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span className="text-fg font-mono font-medium">
                      {formatSpeed(item.bytesPerSecond)}
                    </span>
                  </>
                )}

                {/* ETA (только активные) */}
                {isActive && item.eta > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span className="text-muted">
                      осталось {formatEta(item.eta)}
                    </span>
                  </>
                )}

                {/* Сообщение об ошибке */}
                {isError && item.error && (
                  <span className="text-danger truncate">{item.error}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Actions dropdown ──────────────────────────────────────────────────────────

function ActionsMenu({ showHidden, onToggleHidden, onRefresh, onMkdir, onRename, onDelete, hasSelection, onClose }: {
  showHidden: boolean; onToggleHidden: () => void; onRefresh: () => void
  onMkdir: () => void; onRename: () => void; onDelete: () => void
  hasSelection: boolean; onClose: () => void
}): JSX.Element {
  type ItemDef = [React.ReactNode, string, () => void, boolean, boolean]
  const items: ItemDef[] = [
    [<RefreshCw key="r" size={13} className="text-muted" />, 'Обновить', onRefresh, false, false],
    [<FolderPlus key="f" size={13} className="text-muted" />, 'Новая папка', onMkdir, false, false],
    [<Pencil key="p" size={13} className="text-muted" />, 'Переименовать', onRename, false, !hasSelection],
    [<Trash2 key="t" size={13} />, 'Удалить', onDelete, true, !hasSelection],
  ]
  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-surface border border-border rounded-lg shadow-xl py-1 overflow-hidden">
      <button onClick={() => { onToggleHidden(); onClose() }}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-fg hover:bg-surface-2 transition-colors">
        <span>{showHidden ? 'Скрыть скрытые файлы' : 'Показать скрытые файлы'}</span>
        {showHidden && <Check size={13} className="text-accent" />}
      </button>
      <div className="h-px bg-border my-1 mx-2" />
      {items.map(([icon, label, onClick, danger, disabled], i) => (
        <button key={i} onClick={() => { if (!disabled) { onClick(); onClose() } }} disabled={disabled}
          className={[
            'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors disabled:opacity-40',
            danger ? 'text-danger hover:bg-danger/10' : 'text-fg hover:bg-surface-2',
          ].join(' ')}>
          {icon}{label}
        </button>
      ))}
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
      <input autoFocus value={val} placeholder={placeholder}
        className="flex-1 bg-bg border border-border rounded px-2 py-1 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent"
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && val.trim()) onConfirm(val.trim()); if (e.key === 'Escape') onCancel() }}
      />
      <button onClick={() => val.trim() && onConfirm(val.trim())} className="px-2.5 py-1 text-xs rounded bg-accent text-accent-fg">OK</button>
      <button onClick={onCancel} className="px-2.5 py-1 text-xs rounded border border-border text-muted hover:text-fg">✕</button>
    </div>
  )
}

// ── Компонент панели ──────────────────────────────────────────────────────────

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
  isDropTarget: boolean
  isDragOver: boolean
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
  onDragStart: (entry: PanelEntry) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
}

function Panel(props: PanelProps): JSX.Element {
  const {
    title, path, entries, loading, error, selected, search,
    showHidden, sortField, sortDir, historyCanBack, historyCanForward,
    drives, inputMode, isDropTarget, isDragOver,
    onNavigate, onGoBack, onGoForward, onGoUp, onGoHome, onSelect,
    onSearchChange, onSortChange, onToggleHidden, onRefresh,
    onMkdir, onRename, onDelete, onInputConfirm, onInputCancel,
    onDragStart, onDragOver, onDragLeave, onDrop,
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

  const filtered = entries.filter((e) =>
    !search || e.name.toLowerCase().includes(search.toLowerCase())
  )
  const sorted = sortEntries(filtered, sortField, sortDir)

  // Хлебные крошки
  const crumbs: { label: string; path: string }[] = [{ label: '/', path: '/' }]
  if (path !== '/') {
    const sep = path.includes('\\') ? '\\' : '/'
    path.split(/[\\/]/).filter(Boolean).forEach((seg, i) => {
      const prev = crumbs[crumbs.length - 1].path
      const newPath = i === 0 && /^[A-Z]:$/.test(seg)
        ? seg + sep
        : (prev === '/' ? '' : prev).replace(/[\\/]$/, '') + sep + seg
      crumbs.push({ label: seg, path: newPath })
    })
  }

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
          <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Поиск…"
            className="w-32 pl-6 pr-6 py-1 text-xs bg-bg border border-border rounded-md text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent" />
          {search && (
            <button onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-fg">
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
            Actions <ChevronDown size={11} className={showActions ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          {showActions && (
            <ActionsMenu showHidden={showHidden} onToggleHidden={onToggleHidden}
              onRefresh={onRefresh} onMkdir={onMkdir} onRename={onRename}
              onDelete={onDelete} hasSelection={!!selected} onClose={() => setShowActions(false)} />
          )}
        </div>
      </div>

      {/* Навигация */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-surface/50 border-b border-border shrink-0">
        <button onClick={onGoBack} disabled={!historyCanBack} className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 transition-colors"><ChevronLeft size={14} className="text-muted" /></button>
        <button onClick={onGoForward} disabled={!historyCanForward} className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 transition-colors"><ChevronRight size={14} className="text-muted" /></button>
        <button onClick={onGoUp} disabled={path === '/'} className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 transition-colors"><ArrowUp size={14} className="text-muted" /></button>
        <button onClick={onGoHome} className="p-1 rounded hover:bg-surface-2 transition-colors"><Home size={13} className="text-muted" /></button>
        <div className="flex items-center flex-1 min-w-0 overflow-x-auto ml-1">
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
                    idx === crumbs.length - 1 ? 'text-fg font-medium cursor-default' : 'text-muted hover:text-fg hover:bg-surface-2 cursor-pointer',
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
        {(['name', 'date', 'size'] as SortField[]).map((f, i) => (
          <button key={f} onClick={() => onSortChange(f)}
            className={`px-3 py-1.5 text-left text-[11px] font-semibold text-muted uppercase tracking-wider hover:text-fg transition-colors ${i > 0 ? 'text-right' : ''}`}>
            {f === 'name' ? 'Имя' : f === 'date' ? 'Дата' : 'Размер'}
            {sortField === f && <span className="ml-0.5 text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
          </button>
        ))}
        <div className="px-3 py-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">Тип</div>
      </div>

      {/* Список файлов — drop zone */}
      <div
        className={[
          'flex-1 overflow-y-auto relative transition-all duration-150',
          isDragOver && isDropTarget ? 'ring-2 ring-inset ring-accent bg-accent/5' : '',
        ].join(' ')}
        onDragOver={(e) => { if (isDropTarget) onDragOver(e) }}
        onDragLeave={onDragLeave}
        onDrop={(e) => { if (isDropTarget) onDrop(e) }}
      >
        {/* Drop overlay */}
        {isDragOver && isDropTarget && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-accent text-accent-fg rounded-xl px-6 py-3 flex items-center gap-2 shadow-xl">
              {title === 'Local' ? <Download size={18} /> : <Upload size={18} />}
              <span className="font-semibold text-sm">
                {title === 'Local' ? 'Скачать сюда' : 'Загрузить на сервер'}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-danger bg-danger/10 border-b border-danger/20">
            <AlertCircle size={12} className="shrink-0" /><span className="truncate">{error}</span>
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
              draggable={!entry.isDirectory}
              onDragStart={(e) => {
                if (entry.isDirectory) { e.preventDefault(); return }
                e.dataTransfer.effectAllowed = 'copy'
                e.dataTransfer.setData('text/plain', entry.path)
                onDragStart(entry)
              }}
              onClick={() => onSelect(isSelected ? null : entry)}
              onDoubleClick={() => { if (entry.isDirectory) onNavigate(entry.path) }}
              className={[
                'grid grid-cols-[1fr_110px_75px_65px] items-center select-none',
                'border-b border-border/20 transition-colors text-[12px]',
                !entry.isDirectory ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                isSelected ? 'bg-accent/15 hover:bg-accent/20' : 'hover:bg-surface-2/50',
              ].join(' ')}>
              <div className="flex items-center gap-2 px-3 py-1.5 min-w-0">
                <FileIcon name={entry.name} isDirectory={entry.isDirectory} />
                <span className={['truncate', entry.isDirectory ? 'text-fg font-medium' : 'text-fg/90', entry.name.startsWith('.') ? 'opacity-50' : ''].join(' ')}>
                  {entry.name}
                </span>
              </div>
              <div className="px-2 py-1.5 text-right text-muted text-[11px] whitespace-pre-line leading-tight">{formatDate(entry.modifiedAt)}</div>
              <div className="px-2 py-1.5 text-right text-muted font-mono text-[11px]">{formatSize(entry.size, entry.isDirectory)}</div>
              <div className="px-3 py-1.5 text-muted text-[11px]">{kind}</div>
            </div>
          )
        })}
      </div>

      {/* Inline input */}
      {inputMode === 'mkdir' && <InlineInput placeholder="Название папки" onConfirm={onInputConfirm} onCancel={onInputCancel} />}
      {inputMode === 'rename' && selected && <InlineInput placeholder={selected.name} defaultValue={selected.name} onConfirm={onInputConfirm} onCancel={onInputCancel} />}

      {/* Статус */}
      <div className="shrink-0 px-3 py-1 border-t border-border bg-surface/50 flex items-center gap-2 text-[10px] text-muted">
        <span>{sorted.length} элем.</span>
        {!isDragOver && isDropTarget && <span className="text-muted/50">· Перетащите файл для копирования</span>}
        {selected && (
          <><span className="text-border">·</span>
            <span className="truncate max-w-[100px]">{selected.name}</span>
            {!selected.isDirectory && <><span className="text-border">·</span><span>{formatSize(selected.size)}</span></>}
          </>
        )}
      </div>
    </div>
  )
}

// ── Хук состояния панели ──────────────────────────────────────────────────────

function usePanelState(startPath: string) {
  const [path, setPath]             = useState(startPath)
  const [entries, setEntries]       = useState<PanelEntry[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [selected, setSelected]     = useState<PanelEntry | null>(null)
  const [search, setSearch]         = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const [sortField, setSortField]   = useState<SortField>('name')
  const [sortDir, setSortDir]       = useState<SortDir>('asc')
  const [history, setHistory]       = useState<string[]>([startPath])
  const [histIdx, setHistIdx]       = useState(0)
  const [inputMode, setInputMode]   = useState<'none' | 'mkdir' | 'rename'>('none')
  const [drives, setDrives]         = useState<string[] | undefined>()

  const navigateTo = useCallback((p: string) => {
    setPath(p); setSelected(null); setSearch(''); setInputMode('none'); setError(null)
    setHistory((h) => { const next = [...h.slice(0, histIdx + 1), p]; setHistIdx(next.length - 1); return next })
  }, [histIdx])

  const goBack = useCallback(() => {
    setHistIdx((i) => { if (i <= 0) return i; const ni = i - 1; setPath(history[ni]); setSelected(null); return ni })
  }, [history])

  const goForward = useCallback(() => {
    setHistIdx((i) => { if (i >= history.length - 1) return i; const ni = i + 1; setPath(history[ni]); setSelected(null); return ni })
  }, [history])

  const goUp = useCallback(() => {
    if (path === '/') return
    if (/^[A-Z]:[/\\]?$/.test(path)) { navigateTo('/'); return }
    const sep = path.includes('\\') ? '\\' : '/'
    const re = new RegExp(`[${sep === '\\' ? '\\\\' : '/'}][^${sep === '\\' ? '\\\\' : '/'}]+[${sep === '\\' ? '\\\\' : '/'}]?$`)
    navigateTo(path.replace(re, '') || '/')
  }, [path, navigateTo])

  const toggleSort = useCallback((field: SortField) => {
    setSortField((prev) => { if (prev === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); else setSortDir('asc'); return field })
  }, [])

  return {
    path, entries, setEntries, loading, setLoading, error, setError,
    selected, setSelected, search, setSearch, showHidden, setShowHidden,
    sortField, sortDir, toggleSort,
    historyCanBack: histIdx > 0, historyCanForward: histIdx < history.length - 1,
    navigateTo, goBack, goForward, goUp, inputMode, setInputMode, drives, setDrives,
  }
}

// ── Основной компонент ────────────────────────────────────────────────────────

export function SftpBrowser({ sessionId, serverLabel, active }: Props): JSX.Element {
  const { t } = useTranslation()
  const local  = usePanelState('/')
  const remote = usePanelState('/')

  const [sftpStatus, setSftpStatus] = useState<'idle' | 'opening' | 'ready' | 'error'>('idle')
  const [sftpError,  setSftpError]  = useState<string | null>(null)
  const [transfers, setTransfers]   = useState<Map<string, TransferState>>(new Map())
  const [dragEntry,  setDragEntry]  = useState<PanelEntry | null>(null)
  const [dragSource, setDragSource] = useState<'local' | 'remote' | null>(null)
  const [dragOverPanel, setDragOverPanel] = useState<'local' | 'remote' | null>(null)

  const unsubRef       = useRef<(() => void) | null>(null)
  const localHidRef    = useRef(local.showHidden)
  const mountedRef     = useRef(false)
  const localPathRef   = useRef(local.path)
  const remotePathRef  = useRef(remote.path)
  const sftpReadyRef   = useRef(false)
  const localHidRef2   = useRef(local.showHidden)
  const remoteHidRef2  = useRef(remote.showHidden)
  localHidRef.current  = local.showHidden

  // ── Обновление transfers через ref (без батчинга) ─────────────────────────
  // Проблема: setTransfers внутри IPC-колбэка вызывается вне React-рендера,
  // поэтому используем setTransfers с функцией-апдейтером — это гарантирует
  // что React увидит каждое обновление немедленно.
  const updateTransfer = useCallback((ev: SftpProgressEvent) => {
    setTransfers((prev) => {
      const next = new Map(prev)
      next.set(ev.transferId, {
        ...ev,
        startedAt: prev.get(ev.transferId)?.startedAt ?? Date.now(),
      })
      return next
    })
  }, [])

  // ── SFTP ──────────────────────────────────────────────────────────────────

  const openSftp = useCallback(async () => {
    setSftpStatus('opening')
    const res = await window.netpulse.sftp.open(sessionId)
    if (!res.ok) { setSftpStatus('error'); setSftpError(res.error.message); return }
    setSftpStatus('ready')
    if (unsubRef.current) unsubRef.current()
    // Подписываемся на прогресс СРАЗУ после открытия
    unsubRef.current = window.netpulse.sftp.onProgress((ev: SftpProgressEvent) => {
      if (ev.sessionId !== sessionId) return
      updateTransfer(ev)
    })
  }, [sessionId, updateTransfer])

  useEffect(() => {
    if (active && sftpStatus === 'idle') void openSftp()
    return () => { unsubRef.current?.() }
  }, [active, sftpStatus, openSftp])

  // ── Загрузки ──────────────────────────────────────────────────────────────

  const loadLocal = useCallback(async (p: string) => {
    local.setLoading(true); local.setError(null)
    try {
      const res = await window.netpulse.sftp.localList({
        localPath: p, showHidden: localHidRef.current,
        getHome: p === '/' && !navigator.userAgent.includes('Win') ? true : undefined,
      } as Parameters<typeof window.netpulse.sftp.localList>[0])
      if (res.ok) {
        local.setEntries(res.data.entries as PanelEntry[])
        if (res.data.drives) local.setDrives(res.data.drives)
        if (res.data.path && res.data.path !== p) local.navigateTo(res.data.path)
      } else { local.setError(res.error.message) }
    } catch (err) { local.setError((err as Error).message) }
    local.setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadRemote = useCallback(async (p: string) => {
    remote.setLoading(true); remote.setError(null)
    try {
      const res = await window.netpulse.sftp.list({ sessionId, remotePath: p })
      if (res.ok) remote.setEntries(res.data.entries as PanelEntry[])
      else remote.setError(res.error.message)
    } catch (err) { remote.setError((err as Error).message) }
    remote.setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Эффекты навигации
  useEffect(() => {
    if (localPathRef.current === local.path && local.entries.length > 0) return
    localPathRef.current = local.path; void loadLocal(local.path)
  }, [local.path, loadLocal])

  useEffect(() => {
    if (localHidRef2.current === local.showHidden) return
    localHidRef2.current = local.showHidden; void loadLocal(local.path)
  }, [local.showHidden, local.path, loadLocal])

  useEffect(() => {
    if (sftpStatus !== 'ready') return
    if (remotePathRef.current === remote.path && remote.entries.length > 0) return
    remotePathRef.current = remote.path; void loadRemote(remote.path)
  }, [remote.path, sftpStatus, loadRemote])

  useEffect(() => {
    if (remoteHidRef2.current === remote.showHidden) return
    remoteHidRef2.current = remote.showHidden
    if (sftpStatus === 'ready') void loadRemote(remote.path)
  }, [remote.showHidden, remote.path, sftpStatus, loadRemote])

  useEffect(() => {
    if (sftpStatus !== 'ready' || sftpReadyRef.current) return
    sftpReadyRef.current = true; void loadRemote('/')
  }, [sftpStatus, loadRemote])

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true; void loadLocal('/')
  }, [loadLocal])

  // ── Remote операции ───────────────────────────────────────────────────────

  const handleRemoteMkdir = async (name: string): Promise<void> => {
    const p = remote.path.replace(/\/$/, '') + '/' + name
    const res = await window.netpulse.sftp.mkdir({ sessionId, remotePath: p })
    if (!res.ok) remote.setError(res.error.message)
    remote.setInputMode('none'); void loadRemote(remote.path)
  }

  const handleRemoteRename = async (newName: string): Promise<void> => {
    if (!remote.selected) return
    const dir = remote.selected.path.replace(/\/[^/]+$/, '') || '/'
    const newPath = dir.replace(/\/$/, '') + '/' + newName
    const res = await window.netpulse.sftp.rename({ sessionId, oldPath: remote.selected.path, newPath })
    if (!res.ok) remote.setError(res.error.message)
    remote.setInputMode('none'); remote.setSelected(null); void loadRemote(remote.path)
  }

  const handleRemoteDelete = async (): Promise<void> => {
    if (!remote.selected) return
    const res = await window.netpulse.sftp.delete({ sessionId, remotePath: remote.selected.path, isDirectory: remote.selected.isDirectory })
    if (!res.ok) remote.setError(res.error.message)
    remote.setSelected(null); void loadRemote(remote.path)
  }

  // ── Передача файлов ───────────────────────────────────────────────────────

  const transferToRemote = async (entry: PanelEntry): Promise<void> => {
    if (entry.isDirectory) return
    // НЕ ждём завершения — IPC вызов запускает передачу асинхронно
    // прогресс приходит через onProgress подписку в реальном времени
    window.netpulse.sftp.transferToRemote({
      sessionId, localPath: entry.path, remotePath: remote.path, direction: 'upload',
    }).then((res) => {
      if (!res.ok) remote.setError(res.error.message)
      else void loadRemote(remote.path)
    })
  }

  const transferToLocal = async (entry: PanelEntry): Promise<void> => {
    if (entry.isDirectory) return
    window.netpulse.sftp.transferToLocal({
      sessionId, localPath: local.path, remotePath: entry.path, direction: 'download',
    }).then((res) => {
      if (!res.ok) local.setError(res.error.message)
      else void loadLocal(local.path)
    })
  }

  // ── Drag-and-drop ─────────────────────────────────────────────────────────

  const handleDragStart = (source: 'local' | 'remote') => (entry: PanelEntry): void => {
    setDragEntry(entry); setDragSource(source)
  }

  const handleDragOver = (panel: 'local' | 'remote') => (e: React.DragEvent): void => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOverPanel(panel)
  }

  const handleDragLeave = (): void => setDragOverPanel(null)

  const handleDrop = (targetPanel: 'local' | 'remote') => (e: React.DragEvent): void => {
    e.preventDefault(); setDragOverPanel(null)
    if (dragSource === targetPanel || !dragEntry) { setDragEntry(null); setDragSource(null); return }
    if (targetPanel === 'remote' && dragSource === 'local') void transferToRemote(dragEntry)
    else if (targetPanel === 'local' && dragSource === 'remote') void transferToLocal(dragEntry)
    setDragEntry(null); setDragSource(null)
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

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg relative"
      onDragEnd={() => { setDragEntry(null); setDragSource(null); setDragOverPanel(null) }}>

      {/* ── Две панели ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Левая */}
        <Panel
          title="Local" path={local.path} entries={local.entries} loading={local.loading}
          error={local.error} selected={local.selected} search={local.search}
          showHidden={local.showHidden} sortField={local.sortField} sortDir={local.sortDir}
          historyCanBack={local.historyCanBack} historyCanForward={local.historyCanForward}
          drives={local.drives} inputMode={local.inputMode}
          isDropTarget={dragSource === 'remote'} isDragOver={dragOverPanel === 'local'}
          onNavigate={local.navigateTo} onGoBack={local.goBack} onGoForward={local.goForward}
          onGoUp={local.goUp} onGoHome={() => void loadLocal('/')} onSelect={local.setSelected}
          onSearchChange={local.setSearch} onSortChange={local.toggleSort}
          onToggleHidden={() => local.setShowHidden((v) => !v)}
          onRefresh={() => void loadLocal(local.path)} onMkdir={() => local.setInputMode('mkdir')}
          onRename={() => local.selected && local.setInputMode('rename')} onDelete={() => {}}
          onInputConfirm={() => local.setInputMode('none')} onInputCancel={() => local.setInputMode('none')}
          onDragStart={handleDragStart('local')} onDragOver={handleDragOver('local')}
          onDragLeave={handleDragLeave} onDrop={handleDrop('local')}
        />

        {/* Кнопки передачи */}
        <div className="flex flex-col items-center justify-center gap-2 px-1 bg-surface border-x border-border shrink-0 w-9">
          <button onClick={() => { if (local.selected && !local.selected.isDirectory) void transferToRemote(local.selected) }}
            disabled={!local.selected || local.selected.isDirectory} title="Загрузить на сервер →"
            className={['w-7 h-7 rounded-full border flex items-center justify-center transition-colors',
              local.selected && !local.selected.isDirectory
                ? 'border-accent bg-accent/10 text-accent hover:bg-accent hover:text-accent-fg'
                : 'border-border text-muted/30 cursor-not-allowed'].join(' ')}>
            <ArrowRightToLine size={13} />
          </button>
          <button onClick={() => { if (remote.selected && !remote.selected.isDirectory) void transferToLocal(remote.selected) }}
            disabled={!remote.selected || remote.selected.isDirectory} title="Скачать на компьютер ←"
            className={['w-7 h-7 rounded-full border flex items-center justify-center transition-colors',
              remote.selected && !remote.selected.isDirectory
                ? 'border-accent bg-accent/10 text-accent hover:bg-accent hover:text-accent-fg'
                : 'border-border text-muted/30 cursor-not-allowed'].join(' ')}>
            <ArrowLeftToLine size={13} />
          </button>
        </div>

        {/* Правая */}
        <Panel
          title={serverLabel} path={remote.path} entries={remote.entries} loading={remote.loading}
          error={remote.error} selected={remote.selected} search={remote.search}
          showHidden={remote.showHidden} sortField={remote.sortField} sortDir={remote.sortDir}
          historyCanBack={remote.historyCanBack} historyCanForward={remote.historyCanForward}
          inputMode={remote.inputMode}
          isDropTarget={dragSource === 'local'} isDragOver={dragOverPanel === 'remote'}
          onNavigate={remote.navigateTo} onGoBack={remote.goBack} onGoForward={remote.goForward}
          onGoUp={remote.goUp} onGoHome={() => void loadRemote('/')} onSelect={remote.setSelected}
          onSearchChange={remote.setSearch} onSortChange={remote.toggleSort}
          onToggleHidden={() => remote.setShowHidden((v) => !v)}
          onRefresh={() => void loadRemote(remote.path)} onMkdir={() => remote.setInputMode('mkdir')}
          onRename={() => remote.selected && remote.setInputMode('rename')}
          onDelete={() => void handleRemoteDelete()}
          onInputConfirm={(v) => remote.inputMode === 'mkdir' ? void handleRemoteMkdir(v) : void handleRemoteRename(v)}
          onInputCancel={() => remote.setInputMode('none')}
          onDragStart={handleDragStart('remote')} onDragOver={handleDragOver('remote')}
          onDragLeave={handleDragLeave} onDrop={handleDrop('remote')}
        />
      </div>

      {/* ── Floating прогресс-панель (absolute внутри relative-контейнера) ── */}
      <TransferPanel
        transfers={transfers}
        onDismiss={(id) => setTransfers((p) => { const n = new Map(p); n.delete(id); return n })}
      />
    </div>
  )
}