import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Loader2, Webhook, Plus, X, Check, ShieldCheck, ShieldAlert } from 'lucide-react'
import type { HttpMethod, HttpHeader, HttpResponseResult } from '@shared/httpinspect-types'
import {
  Button,
  Input,
  Pill,
  PillGroup,
  Toggle,
  Badge,
  Card,
  CopyButton,
  PageContainer,
  PageHeader,
  TableShell,
  Table,
  THead,
  TH,
  TR,
  TD
} from '@/components/ui'

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
type RespTab = 'body' | 'headers' | 'security'

function statusTone(status: number): 'ok' | 'warn' | 'danger' {
  if (status >= 200 && status < 300) return 'ok'
  if (status >= 300 && status < 400) return 'warn'
  return 'danger'
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

export function HttpInspectorPage(): JSX.Element {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [headers, setHeaders] = useState<HttpHeader[]>([{ key: '', value: '' }])
  const [body, setBody] = useState('')
  const [followRedirects, setFollowRedirects] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<HttpResponseResult | null>(null)
  const [tab, setTab] = useState<RespTab>('body')

  const bodyAllowed = method !== 'GET' && method !== 'HEAD'

  const setHeader = (i: number, patch: Partial<HttpHeader>): void => {
    setHeaders((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)))
  }
  const addHeader = (): void => setHeaders((prev) => [...prev, { key: '', value: '' }])
  const removeHeader = (i: number): void => setHeaders((prev) => prev.filter((_, idx) => idx !== i))

  const send = async (): Promise<void> => {
    if (!url.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    const res = await window.netpulse.httpinspect.send({
      url: url.trim(),
      method,
      headers: headers.filter((h) => h.key.trim()),
      body: bodyAllowed ? body : undefined,
      followRedirects
    })
    setLoading(false)
    if (res.ok) {
      setResult(res.data)
      setTab('body')
    } else {
      setError(res.error.message)
    }
  }

  const prettyBody = (): string => {
    if (!result) return ''
    if (!result.isJson) return result.body
    try {
      return JSON.stringify(JSON.parse(result.body), null, 2)
    } catch {
      return result.body
    }
  }

  const presentCount = result?.securityHeaders.filter((h) => h.present).length ?? 0

  return (
    <PageContainer maxWidth="max-w-4xl">
      <PageHeader icon={Webhook} title={t('nav.httpinspect')} />

      <div className="flex gap-2 mb-3">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as HttpMethod)}
          className="h-10 px-3 rounded-control bg-surface-2 border border-border text-sm font-mono outline-none focus:border-accent focus:shadow-focus-ring"
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
          placeholder={t('httpinspect.urlPlaceholder')}
          mono={false}
        />
        <Button variant="primary" onClick={() => void send()} disabled={loading || !url.trim()}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {t('httpinspect.send')}
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer mb-5">
        <Toggle checked={followRedirects} onChange={setFollowRedirects} label={t('httpinspect.followRedirects')} />
        {t('httpinspect.followRedirects')}
      </label>

      {/* ── Заголовки запроса ── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted uppercase tracking-wider">{t('httpinspect.requestHeaders')}</span>
          <button onClick={addHeader} className="text-xs text-accent hover:underline flex items-center gap-1">
            <Plus size={12} /> {t('httpinspect.addHeader')}
          </button>
        </div>
        <div className="space-y-1.5">
          {headers.map((h, i) => (
            <div key={i} className="flex gap-1.5">
              <Input
                value={h.key}
                onChange={(e) => setHeader(i, { key: e.target.value })}
                placeholder="Header-Name"
                className="flex-1 h-8 text-xs"
              />
              <Input
                value={h.value}
                onChange={(e) => setHeader(i, { value: e.target.value })}
                placeholder="value"
                className="flex-[2] h-8 text-xs"
              />
              <button onClick={() => removeHeader(i)} className="text-muted hover:text-danger px-1.5 shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Тело запроса ── */}
      {bodyAllowed && (
        <div className="mb-5">
          <span className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">{t('httpinspect.requestBody')}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder='{"key": "value"}'
            rows={5}
            className="w-full px-3 py-2 rounded-control bg-surface-2 border border-border text-xs font-mono outline-none focus:border-accent focus:shadow-focus-ring resize-none"
          />
        </div>
      )}

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {/* ── Ответ ── */}
      {result && (
        <div>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <Badge tone={statusTone(result.status)}>{result.status} {result.statusText}</Badge>
            <span className="text-xs text-muted font-mono tabular-nums">{result.elapsedMs} ms</span>
            <span className="text-xs text-muted font-mono tabular-nums">{formatBytes(result.sizeBytes)}</span>
            {result.redirectChain.length > 0 && (
              <span className="text-xs text-muted">{t('httpinspect.redirects')}: {result.redirectChain.length}</span>
            )}
          </div>

          {result.redirectChain.length > 0 && (
            <Card className="p-3 mb-3 text-xs font-mono space-y-1">
              {result.redirectChain.map((hop, i) => (
                <div key={i} className="text-muted truncate">
                  <span className="text-warn">{hop.status}</span> {hop.url} → {hop.location}
                </div>
              ))}
              <div className="text-fg truncate">→ {result.finalUrl}</div>
            </Card>
          )}

          <PillGroup>
            <Pill active={tab === 'body'} onClick={() => setTab('body')}>{t('httpinspect.tabBody')}</Pill>
            <Pill active={tab === 'headers'} onClick={() => setTab('headers')}>
              {t('httpinspect.tabHeaders')} ({result.headers.length})
            </Pill>
            <Pill active={tab === 'security'} onClick={() => setTab('security')}>
              {t('httpinspect.tabSecurity')} ({presentCount}/{result.securityHeaders.length})
            </Pill>
          </PillGroup>

          <div className="mt-3">
            {tab === 'body' && (
              <Card className="p-3 relative">
                {result.bodyTruncated && (
                  <p className="text-[11px] text-warn mb-2">{t('httpinspect.bodyTruncated')}</p>
                )}
                <pre className="text-xs font-mono whitespace-pre-wrap break-all text-fg max-h-[480px] overflow-y-auto">
                  {prettyBody() || <span className="text-muted">{t('httpinspect.emptyBody')}</span>}
                </pre>
                {result.body && (
                  <div className="absolute top-3 right-3">
                    <CopyButton value={result.body} />
                  </div>
                )}
              </Card>
            )}

            {tab === 'headers' && (
              <TableShell>
                <Table>
                  <THead>
                    <tr>
                      <TH>Header</TH>
                      <TH>Value</TH>
                    </tr>
                  </THead>
                  <tbody className="font-mono text-xs">
                    {result.headers.map((h, i) => (
                      <TR key={i}>
                        <TD className="text-muted whitespace-nowrap">{h.key}</TD>
                        <TD className="break-all">{h.value}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </TableShell>
            )}

            {tab === 'security' && (
              <div className="space-y-2">
                {result.securityHeaders.map((h) => (
                  <Card key={h.name} className="p-3 flex items-start gap-2.5">
                    {h.present ? (
                      <ShieldCheck size={16} className="text-ok shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert size={16} className="text-warn shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium text-fg">{h.name}</span>
                        {h.present ? (
                          <Check size={12} className="text-ok" />
                        ) : (
                          <span className="text-[10px] text-warn uppercase tracking-wider">{t('httpinspect.missing')}</span>
                        )}
                      </div>
                      {h.value && <p className="text-[11px] text-muted font-mono break-all mt-0.5">{h.value}</p>}
                      <p className="text-[11px] text-muted mt-1">{h.recommendation}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  )
}
