import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, KeySquare, Lock, Trash2, Download, AlertTriangle } from 'lucide-react'
import { useSshKeysStore } from '@/store/sshkeys'
import type { SshKeyMeta, SshKeyType } from '@shared/sshkeys-types'
import {
  Button,
  Input,
  Pill,
  PillGroup,
  Card,
  Badge,
  Banner,
  Modal,
  CopyButton,
  EmptyState,
  PageContainer,
  PageHeader
} from '@/components/ui'

type FormMode = 'generate' | 'import'
const RSA_BITS = [2048, 3072, 4096] as const

export function SshKeysPage(): JSX.Element {
  const { t } = useTranslation()
  const { keys, loading, error, load, generate, importKey, deleteKey } = useSshKeysStore()

  useEffect(() => { void load() }, [load])

  const [showForm, setShowForm] = useState(false)
  const [mode, setMode] = useState<FormMode>('generate')
  const [label, setLabel] = useState('')
  const [keyType, setKeyType] = useState<SshKeyType>('ed25519')
  const [bits, setBits] = useState<number>(4096)
  const [passphrase, setPassphrase] = useState('')
  const [comment, setComment] = useState('')
  const [importText, setImportText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [exportState, setExportState] = useState<{ key: SshKeyMeta; text: string } | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const resetForm = (): void => {
    setLabel(''); setKeyType('ed25519'); setBits(4096); setPassphrase('')
    setComment(''); setImportText(''); setMode('generate')
  }

  const openForm = (): void => { resetForm(); setShowForm(true) }
  const closeForm = (): void => { setShowForm(false) }

  const canSubmit = mode === 'generate'
    ? label.trim().length > 0
    : label.trim().length > 0 && importText.trim().length > 0

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    const created = mode === 'generate'
      ? await generate({
          label: label.trim(),
          type: keyType,
          bits: keyType === 'rsa' ? bits : undefined,
          passphrase: passphrase || undefined,
          comment: comment.trim() || undefined
        })
      : await importKey({
          label: label.trim(),
          privateKey: importText,
          passphrase: passphrase || undefined
        })
    setSubmitting(false)
    if (created) closeForm()
  }

  const handleExport = async (key: SshKeyMeta): Promise<void> => {
    setExportError(null)
    const res = await window.netpulse.sshkeys.export(key.id)
    if (res.ok) setExportState({ key, text: res.data.privateKey })
    else setExportError(res.error.message)
  }

  return (
    <PageContainer maxWidth="max-w-3xl">
      <PageHeader
        icon={KeySquare}
        title={t('nav.sshkeys')}
        meta={
          <Button size="sm" variant="primary" onClick={openForm}>
            <Plus size={14} />
            {t('sshkeys.newKey')}
          </Button>
        }
      />

      {exportError && (
        <Banner tone="danger" className="mb-4">{exportError}</Banner>
      )}

      {keys.length === 0 && !loading && (
        <EmptyState icon={KeySquare} title={t('sshkeys.noKeys')} />
      )}

      <div className="space-y-2">
        {keys.map((k) => (
          <Card key={k.id} className="p-3.5">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-fg">{k.label}</span>
                  <Badge tone="accent">{k.type === 'ed25519' ? 'ED25519' : `RSA ${k.bits ?? ''}`.trim()}</Badge>
                  {k.hasPassphrase && (
                    <span title={t('sshkeys.hasPassphrase')}>
                      <Lock size={12} className="text-muted" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted font-mono mt-1">{k.fingerprint}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <code className="text-[11px] font-mono text-muted bg-surface-2 rounded-control px-2 py-1 truncate max-w-full">
                    {k.publicKey}
                  </code>
                  <CopyButton value={k.publicKey} />
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => void handleExport(k)}
                  className="text-muted hover:text-fg transition-colors p-1.5"
                  title={t('sshkeys.exportPrivate')}
                >
                  <Download size={15} />
                </button>
                <button
                  onClick={() => void deleteKey(k.id)}
                  className="text-muted hover:text-danger transition-colors p-1.5"
                  title={t('sshkeys.delete')}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Модалка: генерация / импорт ── */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={t('sshkeys.newKey')}
        widthClassName="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>{t('sshkeys.cancel')}</Button>
            <Button variant="primary" onClick={() => void handleSubmit()} disabled={!canSubmit || submitting}>
              {mode === 'generate' ? t('sshkeys.generate') : t('sshkeys.import')}
            </Button>
          </>
        }
      >
        <PillGroup>
          <Pill active={mode === 'generate'} onClick={() => setMode('generate')}>
            {t('sshkeys.modeGenerate')}
          </Pill>
          <Pill active={mode === 'import'} onClick={() => setMode('import')}>
            {t('sshkeys.modeImport')}
          </Pill>
        </PillGroup>

        {error && <Banner tone="danger" className="mt-4">{error}</Banner>}

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-muted mb-1 block">{t('sshkeys.label')}</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('sshkeys.labelPlaceholder')} mono={false} />
          </div>

          {mode === 'generate' ? (
            <>
              <div>
                <label className="text-xs text-muted mb-1 block">{t('sshkeys.type')}</label>
                <PillGroup>
                  <Pill active={keyType === 'ed25519'} onClick={() => setKeyType('ed25519')}>Ed25519</Pill>
                  <Pill active={keyType === 'rsa'} onClick={() => setKeyType('rsa')}>RSA</Pill>
                </PillGroup>
              </div>
              {keyType === 'rsa' && (
                <div>
                  <label className="text-xs text-muted mb-1 block">{t('sshkeys.bits')}</label>
                  <PillGroup>
                    {RSA_BITS.map((b) => (
                      <Pill key={b} active={bits === b} onClick={() => setBits(b)}>{b}</Pill>
                    ))}
                  </PillGroup>
                </div>
              )}
              <div>
                <label className="text-xs text-muted mb-1 block">{t('sshkeys.comment')}</label>
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="user@netpulse" />
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs text-muted mb-1 block">{t('sshkeys.privateKeyPem')}</label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                rows={6}
                className="w-full px-3 py-2 rounded-control bg-surface-2 border border-border text-xs font-mono outline-none focus:border-accent focus:shadow-focus-ring resize-none"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-muted mb-1 block">{t('sshkeys.passphrase')}</label>
            <Input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder={t('sshkeys.passphrasePlaceholder')}
              mono={false}
            />
          </div>
        </div>
      </Modal>

      {/* ── Модалка: экспорт приватного ключа ── */}
      <Modal
        open={!!exportState}
        onClose={() => setExportState(null)}
        title={exportState ? `${t('sshkeys.exportPrivate')} · ${exportState.key.label}` : undefined}
        widthClassName="max-w-lg"
        footer={<Button variant="secondary" onClick={() => setExportState(null)}>{t('sshkeys.close')}</Button>}
      >
        <Banner tone="warn" icon={AlertTriangle} className="mb-3">
          {t('sshkeys.exportWarning')}
        </Banner>
        {exportState && (
          <div className="relative">
            <textarea
              readOnly
              value={exportState.text}
              rows={10}
              className="w-full px-3 py-2 rounded-control bg-surface-2 border border-border text-xs font-mono outline-none resize-none"
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="absolute top-2 right-2">
              <CopyButton value={exportState.text} />
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  )
}
