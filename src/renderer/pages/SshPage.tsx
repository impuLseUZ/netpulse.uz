/**
 * SshPage — главная страница SSH-клиента (Модуль 8).
 *
 * Макет:
 *  ┌─────────────────────────────────────────────────────┐
 *  │  Список профилей (левая панель, 220px)              │
 *  │  ┌──────────────────────────────────────────────┐   │
 *  │  │  Вкладки активных сессий                     │   │
 *  │  │  ┌────────────────────────────────────────┐  │   │
 *  │  │  │  xterm.js терминал                     │  │   │
 *  │  │  └────────────────────────────────────────┘  │   │
 *  │  └──────────────────────────────────────────────┘   │
 *  └─────────────────────────────────────────────────────┘
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Terminal,
  Trash2,
  Edit2,
  Wifi,
  WifiOff,
  Loader,
  X,
  ServerCrash,
} from 'lucide-react'
import { useSshStore } from '@/store/ssh'
import { SshTerminal } from '@/components/SshTerminal'
import { SshProfileForm } from '@/components/SshProfileForm'
import { SshPasswordPrompt, type PasswordConnectResult } from '@/components/SshPasswordPrompt'
import type { SshProfile, SshProfilePublic, SshSessionStatus } from '@shared/ssh-types'

// ── Иконка статуса сессии ────────────────────────────────────────────────────

function StatusIcon({ status }: { status: SshSessionStatus }): JSX.Element {
  if (status === 'connecting')
    return <Loader size={12} className="text-yellow-400 animate-spin" />
  if (status === 'connected')
    return <Wifi size={12} className="text-ok" />
  if (status === 'error')
    return <ServerCrash size={12} className="text-error" />
  return <WifiOff size={12} className="text-muted" />
}

// ── Основная страница ────────────────────────────────────────────────────────

export function SshPage(): JSX.Element {
  const { t } = useTranslation()
  const {
    profiles,
    sessions,
    activeSessionId,
    loadProfiles,
    openSession,
    closeSession,
    setActiveSession,
  } = useSshStore()

  // Модальные состояния.
  const [showForm, setShowForm] = useState(false)
  const [editProfile, setEditProfile] = useState<Partial<SshProfile> | null>(null)
  const [promptProfile, setPromptProfile] = useState<SshProfilePublic | null>(null)

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  // ── Обработчики профилей ──────────────────────────────────────────────────

  const handleNewProfile = (): void => {
    setEditProfile(null)
    setShowForm(true)
  }

  const handleEditProfile = (profile: SshProfilePublic): void => {
    setEditProfile(profile)
    setShowForm(true)
  }

  const handleSaveProfile = async (profile: SshProfile): Promise<void> => {
    await window.netpulse.ssh.saveProfile(profile)
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
    // Пароль уже сохранён в профиле — подключаемся без диалога.
    if (profile.hasPassword) {
      void openSession(profile.id)
      return
    }
    // Key auth без passphrase — тоже без диалога.
    if (profile.authType === 'key') {
      void openSession(profile.id)
      return
    }
    // Пароль не сохранён — показываем запрос.
    setPromptProfile(profile)
  }

  const handlePasswordConnect = (result: PasswordConnectResult): void => {
    if (!promptProfile) return
    const { password, save } = result
    // Если пользователь выбрал «Сохранить пароль» — обновляем профиль.
    if (save) {
      void window.netpulse.ssh.saveProfile({
        ...promptProfile,
        password,
      }).then(() => loadProfiles())
    }
    void openSession(promptProfile.id, password)
    setPromptProfile(null)
  }

  // ── Рендер ───────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Вкладки сессий */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-0.5 px-2 pt-2 bg-surface border-b border-border shrink-0 overflow-x-auto">
          {sessions.map((sess) => (
            <div
              key={sess.sessionId}
              onClick={() => setActiveSession(sess.sessionId)}
              className={[
                'flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs cursor-pointer select-none whitespace-nowrap transition-colors',
                sess.sessionId === activeSessionId
                  ? 'bg-bg text-fg border border-b-bg border-border'
                  : 'text-muted hover:text-fg hover:bg-surface-2',
              ].join(' ')}
            >
              <StatusIcon status={sess.status} />
              <span className="max-w-[140px] truncate">{sess.label}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  void closeSession(sess.sessionId)
                }}
                className="ml-1 text-muted hover:text-error transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Основной контент */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Левая панель: список профилей ── */}
        <aside className="w-56 shrink-0 bg-surface border-r border-border flex flex-col">
          <div className="flex items-center justify-between px-3 py-3 border-b border-border">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              {t('ssh.profiles')}
            </span>
            <button
              onClick={handleNewProfile}
              title={t('ssh.newProfile')}
              className="text-muted hover:text-fg transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {profiles.length === 0 && (
              <p className="text-xs text-muted px-3 py-4 text-center">
                {t('ssh.noProfiles')}
              </p>
            )}
            {profiles.map((p) => (
              <div
                key={p.id}
                className="group flex items-center gap-2 px-3 py-2 hover:bg-surface-2 cursor-pointer"
                onDoubleClick={() => handleConnect(p)}
              >
                <Terminal size={14} className="text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg truncate">{p.label}</p>
                  <p className="text-[11px] text-muted truncate">
                    {p.username}@{p.host}:{p.port}
                  </p>
                </div>
                {/* Кнопки редактирования/удаления — видны при ховере */}
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditProfile(p)
                    }}
                    className="text-muted hover:text-fg transition-colors"
                    title={t('ssh.editProfile')}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleDeleteProfile(p.id)
                    }}
                    className="text-muted hover:text-error transition-colors"
                    title={t('ssh.deleteProfile')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Подсказка двойного клика */}
          {profiles.length > 0 && (
            <p className="text-[10px] text-muted px-3 py-2 border-t border-border">
              {t('ssh.doubleClickHint')}
            </p>
          )}
        </aside>

        {/* ── Правая часть: терминалы ── */}
        <div className="flex-1 bg-[#0b0e14] relative overflow-hidden">
          {sessions.length === 0 ? (
            /* Экран приветствия */
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
              <Terminal size={40} className="text-muted" strokeWidth={1.5} />
              <div>
                <p className="text-fg font-medium">{t('ssh.welcome')}</p>
                <p className="text-sm text-muted mt-1">{t('ssh.welcomeHint')}</p>
              </div>
              <button
                onClick={handleNewProfile}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm hover:opacity-90 transition-opacity"
              >
                <Plus size={15} />
                {t('ssh.newProfile')}
              </button>
            </div>
          ) : (
            /* Монтируем все терминалы, показываем только активный */
            sessions.map((sess) => (
              <div
                key={sess.sessionId}
                className="absolute inset-0"
                style={{ display: sess.sessionId === activeSessionId ? 'block' : 'none' }}
              >
                {/* Оверлей статуса (connecting / error / disconnected) */}
                {sess.status !== 'connected' && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0b0e14]/90 backdrop-blur-sm">
                    {sess.status === 'connecting' && (
                      <>
                        <Loader size={24} className="text-accent animate-spin" />
                        <p className="text-sm text-muted">{t('ssh.connecting')}</p>
                        <p className="text-xs text-muted">{sess.host}</p>
                      </>
                    )}
                    {sess.status === 'error' && (
                      <>
                        <ServerCrash size={28} className="text-error" />
                        <p className="text-sm text-fg">{t('ssh.errorConnect')}</p>
                        <p className="text-xs text-error max-w-xs text-center">
                          {sess.error}
                        </p>
                        <button
                          onClick={() => void closeSession(sess.sessionId)}
                          className="mt-2 px-3 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-fg transition-colors"
                        >
                          {t('ssh.closeTab')}
                        </button>
                      </>
                    )}
                    {sess.status === 'disconnected' && (
                      <>
                        <WifiOff size={24} className="text-muted" />
                        <p className="text-sm text-muted">{t('ssh.disconnected')}</p>
                        <button
                          onClick={() => void closeSession(sess.sessionId)}
                          className="mt-1 px-3 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-fg transition-colors"
                        >
                          {t('ssh.closeTab')}
                        </button>
                      </>
                    )}
                  </div>
                )}
                <SshTerminal
                  sessionId={sess.sessionId}
                  active={sess.sessionId === activeSessionId}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Модалка профиля */}
      {showForm && (
        <SshProfileForm
          profile={editProfile}
          onSave={(p) => void handleSaveProfile(p)}
          onCancel={() => {
            setShowForm(false)
            setEditProfile(null)
          }}
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