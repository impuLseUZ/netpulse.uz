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
 */
import { useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import 'xterm/css/xterm.css'

interface Props {
  sessionId: string
  /** Виден ли этот терминал (скрытые — не подгоняем размер). */
  active: boolean
}

export function SshTerminal({ sessionId, active }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  // Храним sessionId в ref чтобы обращаться внутри обработчиков событий DOM
  // без пересоздания слушателей при ре-рендере.
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId

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
      theme: {
        background: '#0b0e14',
        foreground: '#cdd6f4',
        cursor: '#f5c2e7',
        black: '#45475a',
        red: '#f38ba8',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        blue: '#89b4fa',
        magenta: '#f5c2e7',
        cyan: '#94e2d5',
        white: '#bac2de',
        brightBlack: '#585b70',
        brightRed: '#f38ba8',
        brightGreen: '#a6e3a1',
        brightYellow: '#f9e2af',
        brightBlue: '#89b4fa',
        brightMagenta: '#f5c2e7',
        brightCyan: '#94e2d5',
        brightWhite: '#a6adc8',
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

    // Ввод пользователя → main → SSH-сервер.
    // Ctrl+V (\x16) перехватываем и заменяем на реальную вставку из буфера,
    // иначе шелл получит управляющий символ ^V вместо текста.
    const inputDispose = term.onData((data) => {
      if (data === '\x16') {
        void paste()
        return
      }
      void window.netpulse.ssh.input({ sessionId: sessionIdRef.current, data })
    })

    // PTY-данные из main → терминал.
    const unsubData = window.netpulse.ssh.onData(
      (ev: import('@shared/ssh-types').SshDataEvent) => {
        if (ev.sessionId !== sessionIdRef.current) return
        term.write(ev.data)
      }
    )

    return () => {
      inputDispose.dispose()
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
    <div
      ref={containerRef}
      className="w-full h-full bg-[#0b0e14]"
      onClick={() => termRef.current?.focus()}
      onContextMenu={handleContextMenu}
    />
  )
}