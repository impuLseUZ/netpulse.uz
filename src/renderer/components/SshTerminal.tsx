/**
 * SshTerminal — xterm.js терминал, привязанный к одной SSH-сессии.
 *
 * Компонент монтируется один раз на sessionId.
 * PTY-данные (ssh:data) прослушиваются напрямую через window.netpulse.ssh.onData,
 * минуя React-стейт, чтобы не вызывать лишних ре-рендеров.
 * Resize — через ResizeObserver + FitAddon.
 *
 * Вставка:
 *  - ПКМ → вставляет из буфера обмена (через contextmenu на контейнере)
 *  - Ctrl+V → перехватывается в onData (\x16) и тоже вставляет из буфера
 *
 * Подсказки команд (ghost-suggestion, как в fish/PSReadLine):
 *  - Локально отслеживаем «предполагаемый» текст текущей строки ввода —
 *    только по нашим же исходящим клавишам (best-effort: реальный редактор
 *    строки живёт на сервере, мы его не видим). Любая escape-последовательность
 *    (стрелки, история и т.п.) сбрасывает отслеживание, чтобы не показывать
 *    подсказку по неверному контексту.
 *  - История команд — per-host, хранится в localStorage, ничего не уходит
 *    на сервер.
 *  - Подсказка рисуется отдельным div поверх xterm (не пишется в сам буфер
 *    терминала, чтобы не конфликтовать с эхом от сервера), позиционируется
 *    по cursorX/cursorY терминала и обновляется на onCursorMove.
 *  - Принять: → (Right Arrow) или Tab — досылает остаток строки как обычный
 *    ввод. Если подсказки нет — Tab уходит на сервер как обычно (нативное
 *    автодополнение shell'а).
 */
import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import 'xterm/css/xterm.css'

interface Props {
  sessionId: string
  /** Хост сессии — используется как ключ истории команд для подсказок. */
  host: string
  /** Виден ли этот терминал (скрытые — не подгоняем размер). */
  active: boolean
}

const HISTORY_LIMIT = 200

function historyKey(host: string): string {
  return `netpulse:sshHistory:${host}`
}

function loadHistory(host: string): string[] {
  try {
    const raw = localStorage.getItem(historyKey(host))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function saveHistory(host: string, history: string[]): void {
  try {
    localStorage.setItem(historyKey(host), JSON.stringify(history))
  } catch {
    // localStorage недоступен/переполнен — подсказки просто не переживут перезапуск.
  }
}

interface SuggestionState {
  text: string
  top: number
  left: number
  lineHeight: number
}

export function SshTerminal({ sessionId, host, active }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  // Храним sessionId в ref чтобы обращаться внутри обработчиков событий DOM
  // без пересоздания слушателей при ре-рендере.
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId

  // ── Подсказки команд ──────────────────────────────────────────────────────
  const historyRef = useRef<string[]>([])
  const bufferRef = useRef('')          // наша лучшая догадка о текущей строке ввода
  const suggestionRemainderRef = useRef('') // хвост подсказки (то что допечатать при Accept)
  const [suggestion, setSuggestion] = useState<SuggestionState | null>(null)

  const clearSuggestion = (): void => {
    suggestionRemainderRef.current = ''
    setSuggestion(null)
  }

  const recomputeSuggestion = (): void => {
    const term = termRef.current
    const container = containerRef.current
    if (!term || !container) { clearSuggestion(); return }

    const buf = bufferRef.current
    const match = buf ? historyRef.current.find((h) => h !== buf && h.startsWith(buf)) : undefined
    if (!match) { clearSuggestion(); return }
    const remainder = match.slice(buf.length)
    suggestionRemainderRef.current = remainder

    const rect = container.getBoundingClientRect()
    const cellWidth = rect.width / term.cols
    const cellHeight = rect.height / term.rows
    const cursorX = term.buffer.active.cursorX
    const cursorY = term.buffer.active.cursorY

    setSuggestion({
      text: remainder,
      left: cursorX * cellWidth,
      top: cursorY * cellHeight,
      lineHeight: cellHeight,
    })
  }

  const commitHistory = (raw: string): void => {
    const cmd = raw.trim()
    if (!cmd) return
    const hist = historyRef.current
    const idx = hist.indexOf(cmd)
    if (idx !== -1) hist.splice(idx, 1)
    hist.unshift(cmd)
    if (hist.length > HISTORY_LIMIT) hist.length = HISTORY_LIMIT
    saveHistory(host, hist)
  }

  /** Вставить текст из буфера обмена в SSH-сессию. */
  const paste = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        void window.netpulse.ssh.input({ sessionId: sessionIdRef.current, data: text })
      }
    } catch {
      // Буфер обмена недоступен — молча игнорируем.
    }
  }

  // Инициализация терминала при монтировании.
  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      // Палитра выведена из токенов дизайн-системы (NOC/oscilloscope): cyan —
      // это --accent, фон/текст — --term-bg/--term-fg. Держит терминал в
      // одном визуальном языке с остальным приложением.
      theme: {
        background: '#0b0e14',
        foreground: '#e3e9f2',
        cursor: '#2ee6c8',
        black: '#1c2333',
        red: '#ef5b5b',
        green: '#3ddc84',
        yellow: '#f5a623',
        blue: '#5b9dd9',
        magenta: '#c792ea',
        cyan: '#2ee6c8',
        white: '#c3cad6',
        brightBlack: '#4a5262',
        brightRed: '#f57a7a',
        brightGreen: '#5ee89f',
        brightYellow: '#f7b94e',
        brightBlue: '#7db3e3',
        brightMagenta: '#d6a8f0',
        brightCyan: '#5cf0d8',
        brightWhite: '#e3e9f2',
      },
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    const linksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(linksAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    termRef.current = term
    fitRef.current = fitAddon
    historyRef.current = loadHistory(host)

    // Ввод пользователя → main → SSH-сервер.
    // Ctrl+V (\x16) перехватываем и заменяем на реальную вставку из буфера,
    // иначе шелл получит управляющий символ ^V вместо текста.
    const inputDispose = term.onData((data) => {
      if (data === '\x16') {
        void paste()
        return
      }

      // Принять подсказку: → или Tab — только когда она реально показана.
      if ((data === '\x1b[C' || data === '\t') && suggestionRemainderRef.current) {
        const remainder = suggestionRemainderRef.current
        bufferRef.current += remainder
        clearSuggestion()
        void window.netpulse.ssh.input({ sessionId: sessionIdRef.current, data: remainder })
        return
      }

      // Best-effort отслеживание текущей строки ввода — только по нашим
      // собственным клавишам, для подбора подсказки из истории.
      if (data.length === 1) {
        const code = data.charCodeAt(0)
        if (data === '\r' || data === '\n') {
          commitHistory(bufferRef.current)
          bufferRef.current = ''
        } else if (data === '\x7f' || data === '\b') {
          bufferRef.current = bufferRef.current.slice(0, -1)
        } else if (data === '\x03' || data === '\x15') {
          // Ctrl+C / Ctrl+U — обрыв или очистка строки.
          bufferRef.current = ''
        } else if (data === '\x17') {
          // Ctrl+W — стереть последнее «слово».
          bufferRef.current = bufferRef.current.replace(/\S*\s*$/, '')
        } else if (code >= 32 && code !== 127) {
          bufferRef.current += data
        }
      } else if (data.charCodeAt(0) === 0x1b) {
        // Стрелки/история/прочие escape-последовательности — теряем
        // синхронизацию со строкой на сервере, сбрасываем догадку.
        bufferRef.current = ''
      } else {
        // Вставка текста и т.п. — считаем печатным текстом.
        bufferRef.current += data
      }

      clearSuggestion()
      void window.netpulse.ssh.input({ sessionId: sessionIdRef.current, data })
    })

    // Курсор реально двигается только после эха с сервера — пересчитываем
    // подсказку и её позицию именно в этот момент, а не сразу на onData.
    const cursorMoveDispose = term.onCursorMove(() => recomputeSuggestion())

    // PTY-данные из main → терминал.
    const unsubData = window.netpulse.ssh.onData(
      (ev: import('@shared/ssh-types').SshDataEvent) => {
        if (ev.sessionId !== sessionIdRef.current) return
        term.write(ev.data)
      }
    )

    return () => {
      inputDispose.dispose()
      cursorMoveDispose.dispose()
      unsubData()
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  // sessionId намеренно не в deps — терминал живёт весь срок сессии.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Подгонка размера при изменении видимости или размера контейнера.
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const fit = (): void => {
      const fitAddon = fitRef.current
      const term = termRef.current
      if (!fitAddon || !term) return
      try {
        fitAddon.fit()
        void window.netpulse.ssh.resize({
          sessionId: sessionIdRef.current,
          cols: term.cols,
          rows: term.rows,
        })
        recomputeSuggestion()
      } catch {
        // FitAddon бросает если контейнер не виден — игнорируем.
      }
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(container)
    return () => observer.disconnect()
  }, [active])

  // ПКМ на терминале → вставить из буфера обмена.
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault()
    void paste()
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full bg-term"
        onClick={() => termRef.current?.focus()}
        onContextMenu={handleContextMenu}
      />
      {suggestion && (
        <div
          className="absolute whitespace-pre pointer-events-none text-term-fg/35"
          style={{
            top: suggestion.top,
            left: suggestion.left,
            height: suggestion.lineHeight,
            lineHeight: `${suggestion.lineHeight}px`,
            fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
            fontSize: 14,
          }}
        >
          {suggestion.text}
        </div>
      )}
    </div>
  )
}