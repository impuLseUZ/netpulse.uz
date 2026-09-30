/**
 * Список часто встречающихся префиксов поддоменов для DNS-перебора.
 * Не претендует на полноту — это быстрый эвристический набор, дополняющий
 * пассивный поиск через Certificate Transparency (crt.sh).
 */
export const SUBDOMAIN_WORDLIST: readonly string[] = [
  'www', 'mail', 'ftp', 'ftps', 'sftp', 'smtp', 'pop', 'pop3', 'imap', 'webmail',
  'api', 'api-dev', 'api-staging', 'dev', 'test', 'staging', 'stage', 'beta', 'alpha',
  'demo', 'sandbox', 'admin', 'administrator', 'portal', 'panel', 'cpanel', 'whm',
  'blog', 'shop', 'store', 'cdn', 'static', 'assets', 'img', 'images', 'media',
  'video', 'download', 'downloads', 'files', 'docs', 'wiki', 'support', 'help',
  'status', 'git', 'gitlab', 'github', 'jenkins', 'ci', 'cd', 'build',
  'db', 'sql', 'mysql', 'postgres', 'redis', 'cache', 'elastic', 'kibana', 'grafana',
  'prometheus', 'monitor', 'monitoring', 'metrics', 'logs', 'log',
  'ns1', 'ns2', 'ns3', 'ns4', 'mx', 'mx1', 'mx2', 'dns', 'dns1', 'dns2',
  'vpn', 'remote', 'office', 'intranet', 'extranet', 'secure', 'login', 'auth', 'sso',
  'app', 'apps', 'm', 'mobile', 'web', 'www2', 'www3',
  'autodiscover', 'autoconfig', 'owa', 'exchange',
  'partner', 'partners', 'client', 'clients', 'crm', 'erp',
  'kube', 'k8s', 'docker', 'registry', 'proxy', 'gateway', 'lb', 'edge',
  'cloud', 's3', 'storage', 'backup', 'old', 'new', 'legacy',
  'prod', 'production', 'preprod', 'qa', 'uat', 'internal', 'local',
  'ns', 'mail2', 'smtp2', 'imap2', 'ws', 'websocket', 'socket', 'chat',
  'forum', 'forums', 'community', 'news', 'events', 'jobs', 'careers',
]
