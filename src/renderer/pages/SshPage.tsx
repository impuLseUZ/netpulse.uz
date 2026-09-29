/**
 * SshPage — SSH-клиент + SFTP файловый менеджер (Модуль 8).
 *
 * Макет (как в Termius):
 *  ┌──────────────────────────────────────────────────────────┐
 *  │ [Tab1 ×] [Tab2 ×]  …  вкладки сессий                   │
 *  ├────────────────────────────────────────────────────────  │
 *  │ Профили  │  [Terminal] [Files]  ←── переключатель вида  │
 *  │ (панель) │  ─────────────────────────────────────────── │
 *  │          │  xterm.js / SftpBrowser                      │
 *  └──────────────────────────────────────────────────────────┘
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus, Terminal, Trash2, Edit2, Wifi, WifiOff,
  Loader, X, ServerCrash, FolderOpen,
} from 'lucide-react'
import { useSshStore } from '@/store/ssh'
import { SshTerminal } from '@/components/SshTerminal'
import { SftpBrowser } from '@/components/SftpBrowser'
import { SshProfileForm } from '@/components/SshProfileForm'
import { SshPasswordPrompt, type PasswordConnectResult } from '@/components/SshPasswordPrompt'
import { Button, Pill, StatusDot } from '@/components/ui'
import type { SshProfile, SshProfilePublic, SshSessionStatus } from '@shared/ssh-types'

type SessionView = 'terminal' | 'sftp'

// ── Иконка статуса ──────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: SshSessionStatus }): JSX.Element {
  if (status === 'connecting') return <Loader size={11} className="text-warn animate-spin" />
  if (status === 'connected')  return <Wifi size={11} className="text-ok" />
  if (status === 'error')      return <ServerCrash size={11} className="text-danger" />
  return <WifiOff size={11} className="text-muted" />
}

// ── Основная страница ────────────────────────────────────────────────────────

export function SshPage(): JSX.Element {
  const { t } = useTranslation()
  const {
    profiles, sessions, activeSessionId,
    loadProfiles, openSession, closeSession, setActiveSession,
  } = useSshStore()

  const [showForm, setShowForm]         = useState(false)
  const [editProfile, setEditProfile]   = useState<Partial<SshProfile> | null>(null)
  const [promptProfile, setPromptProfile] = useState<SshProfilePublic | null>(null)
  // Вид для каждой сессии: терминал или SFTP.
  const [sessionViews, setSessionViews] = useState<Record<string, SessionView>>({})

  useEffect(() => { void loadProfiles() }, [loadProfiles])

  const getView = (sessionId: string): SessionView => sessionViews[sessionId] ?? 'terminal'
  const setView = (sessionId: string, view: SessionView): void =>
    setSessionViews((prev) => ({ ...prev, [sessionId]: view }))

  // ── Профили ──────────────────────────────────────────────────────────────

  const handleNewProfile = (): void => { setEditProfile(null); setShowForm(true) }

  const handleEditProfile = (p: SshProfilePublic): void => { setEditProfile(p); setShowForm(true) }

  const handleSaveProfile = async (p: SshProfile): Promise<void> => {
    await window.netpulse.ssh.saveProfile(p)
    await loadProfiles()
    setShowForm(false)
    setEditProfile(null)
  }

  const handleDeleteProfile = async (id: string): Promise<void> => {
    await window.netpulse.ssh.deleteProfile(id)
    await loadProfiles()
  }

  // ── Подключение ───────────────────────────────────────────────────────────

  const handleConnect = (profile: SshProfilePublic): void => {
    if (profile.hasPassword || profile.authType === 'key') {
      void openSession(profile.id)
    } else {
      setPromptProfile(profile)
    }
  }

  const handlePasswordConnect = (result: PasswordConnectResult): void => {
    if (!promptProfile) return
    const { password, save } = result
    if (save) {
      void window.netpulse.ssh.saveProfile({ ...promptProfile, password })
        .then(() => loadProfiles())
    }
    void openSession(promptProfile.id, password)
    setPromptProfile(null)
  }

  // ── Активная сессия ───────────────────────────────────────────────────────

  const activeSess = sessions.find((s) => s.sessionId === activeSessionId)
  const activeView = activeSessionId ? getView(activeSessionId) : 'terminal'

  // ── Рендер ───────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Строка вкладок сессий ── */}
      {sessions.length > 0 && (
        <div className="flex items-end gap-0 pl-2 pr-1 pt-1.5 bg-surface border-b border-border shrink-0 overflow-x-auto">
          {sessions.map((sess) => {
            const isActive = sess.sessionId === activeSessionId
            return (
              <div
                key={sess.sessionId}
                onClick={() => setActiveSession(sess.sessionId)}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer select-none',
                  'whitespace-nowrap border border-b-0 rounded-t-md transition-all',
                  isActive
                    ? 'bg-bg text-fg border-border -mb-px z-10'
                    : 'bg-surface-2 text-muted border-transparent hover:text-fg hover:bg-surface',
                ].join(' ')}
              >
                <StatusIcon status={sess.status} />
                <span className="max-w-[120px] truncate">{sess.label}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); void closeSession(sess.sessionId) }}
                  className="ml-0.5 text-muted hover:text-danger transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Основной контент ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Левая панель — профили ── */}
        <aside className="w-56 shrink-0 bg-surface border-r border-border flex flex-col">
          {/* Заголовок */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              {t('ssh.profiles')}
            </span>
            <button
              onClick={handleNewProfile}
              title={t('ssh.newProfile')}
              className="text-muted hover:text-fg transition-colors"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Список профилей */}
          <div className="flex-1 overflow-y-auto py-1">
            {profiles.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                <Terminal size={24} className="text-muted/40" strokeWidth={1.5} />
                <p className="text-xs text-muted">{t('ssh.noProfiles')}</p>
                <button
                  onClick={handleNewProfile}
                  className="text-xs text-accent hover:underline"
                >
                  {t('ssh.newProfile')}
                </button>
              </div>
            )}
            {profiles.map((p) => {
              const isConnected = sessions.some(
                (s) => s.profileId === p.id && s.status === 'connected'
              )
              return (
                <div
                  key={p.id}
                  className="group flex items-center gap-2 px-3 py-2 hover:bg-surface-2 cursor-pointer"
                  onDoubleClick={() => handleConnect(p)}
                >
                  {/* Индикатор активного соединения */}
                  <StatusDot tone={isConnected ? 'ok' : 'muted'} pulse={isConnected} className="shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg truncate font-medium">{p.label}</p>
                    <p className="text-[11px] text-muted truncate">
                      {p.username}@{p.host}:{p.port}
                    </p>
                  </div>

                  {/* Кнопки — при ховере */}
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditProfile(p) }}
                      className="text-muted hover:text-fg transition-colors"
                      title={t('ssh.editProfile')}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); void handleDeleteProfile(p.id) }}
                      className="text-muted hover:text-danger transition-colors"
                      title={t('ssh.deleteProfile')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {profiles.length > 0 && (
            <p className="text-[10px] text-muted/60 px-3 py-2 border-t border-border">
              {t('ssh.doubleClickHint')}
            </p>
          )}
        </aside>

        {/* ── Правая часть: терминал / SFTP ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Переключатель Terminal / Files — только когда есть активная подключённая сессия */}
          {activeSess && activeSess.status === 'connected' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border-b border-border shrink-0">
              <Pill active={activeView === 'terminal'} onClick={() => setView(activeSess.sessionId, 'terminal')}>
                <span className="inline-flex items-center gap-1.5">
                  <Terminal size={13} />
                  {t('ssh.viewTerminal')}
                </span>
              </Pill>
              <Pill active={activeView === 'sftp'} onClick={() => setView(activeSess.sessionId, 'sftp')}>
                <span className="inline-flex items-center gap-1.5">
                  <FolderOpen size={13} />
                  {t('ssh.viewFiles')}
                </span>
              </Pill>
              <div className="ml-auto text-[11px] text-muted font-mono">
                {activeSess.host}
              </div>
            </div>
          )}

          {/* Контент */}
          <div className="flex-1 relative overflow-hidden">
            {sessions.length === 0 ? (
              /* Экран приветствия */
              <div className="h-full flex flex-col items-center justify-center gap-5 text-center px-8 bg-term">
                <div className="w-14 h-14 rounded-card bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <Terminal size={28} className="text-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-term-fg font-semibold text-base">{t('ssh.welcome')}</p>
                  <p className="text-sm text-muted mt-1">{t('ssh.welcomeHint')}</p>
                </div>
                <Button variant="primary" onClick={handleNewProfile}>
                  <Plus size={15} />
                  {t('ssh.newProfile')}
                </Button>
              </div>
            ) : (
              sessions.map((sess) => {
                const isActive = sess.sessionId === activeSessionId
                const view = getView(sess.sessionId)
                return (
                  <div
                    key={sess.sessionId}
                    className="absolute inset-0"
                    style={{ display: isActive ? 'flex' : 'none', flexDirection: 'column' }}
                  >
                    {/* Оверлей connecting / error / disconnected */}
                    {sess.status !== 'connected' && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-term/95 backdrop-blur-sm">
                        {sess.status === 'connecting' && (
                          <>
                            <Loader size={28} className="text-accent animate-spin" />
                            <p className="text-sm text-muted">{t('ssh.connecting')}</p>
                            <p className="text-xs text-muted/60 font-mono">{sess.host}</p>
                          </>
                        )}
                        {sess.status === 'error' && (
                          <>
                            <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center">
                              <ServerCrash size={22} className="text-danger" />
                            </div>
                            <p className="text-sm text-term-fg font-medium">{t('ssh.errorConnect')}</p>
                            <p className="text-xs text-danger/80 max-w-xs text-center leading-relaxed">
                              {sess.error}
                            </p>
                            <Button size="sm" variant="secondary" onClick={() => void closeSession(sess.sessionId)} className="mt-1">
                              {t('ssh.closeTab')}
                            </Button>
                          </>
                        )}
                        {sess.status === 'disconnected' && (
                          <>
                            <WifiOff size={24} className="text-muted" />
                            <p className="text-sm text-muted">{t('ssh.disconnected')}</p>
                            <Button size="sm" variant="secondary" onClick={() => void closeSession(sess.sessionId)} className="mt-1">
                              {t('ssh.closeTab')}
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Терминал — всегда монтирован, просто скрыт через CSS */}
                    <div
                      className="absolute inset-0"
                      style={{ display: view === 'terminal' ? 'block' : 'none' }}
                    >
                      <SshTerminal
                        sessionId={sess.sessionId}
                        active={isActive && view === 'terminal'}
                      />
                    </div>

                    {/* SFTP — монтируется только когда переключились */}
                    {view === 'sftp' && sess.status === 'connected' && (
                      <SftpBrowser
                        sessionId={sess.sessionId}
                        serverLabel={sess.label}
                        active={isActive && view === 'sftp'}
                      />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Модалка профиля */}
      {showForm && (
        <SshProfileForm
          profile={editProfile}
          onSave={(p) => void handleSaveProfile(p)}
          onCancel={() => { setShowForm(false); setEditProfile(null) }}
        />
      )}

      {/* Запрос пароля */}
      {promptProfile && (
        <SshPasswordPrompt
          profile={promptProfile}
          onConnect={handlePasswordConnect}
          onCancel={() => setPromptProfile(null)}
        />
      )}
    </div>
  )
}