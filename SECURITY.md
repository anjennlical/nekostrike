# Security boundaries

NekoStrike is a local educational portfolio application. It is not a public hosted
service, a general-purpose penetration testing platform, or a security certification.

- Bind backend/frontend to loopback. Do not reverse-proxy, tunnel or expose them publicly.
- Only built-in fictional ASGI fixtures are valid lab targets. There is no external-target input.
- Host/CORS restrictions and workspace request headers are defense-in-depth, not authentication.
- Keep `.env`, database files, logs, backups and API credentials out of version control.
- AI is opt-in and disabled by default. Do not expose a paid provider endpoint to visitors.
- Input minimization, structured output and evidence checks do not replace semantic review.
- Preserve deterministic verdict/severity and distinguish human review from remediation.
- Back up local data before recovery work. The application detects certain corrupt records;
  it does not automatically repair them or guarantee tamper detection.

The current candidate does not claim multi-user authentication, secure internet hosting,
multi-worker spending limits, complete browser/accessibility QA or independent security certification.

## Reporting a problem

Do not post secrets, personal database exports or exploit details publicly. If GitHub
Private Vulnerability Reporting is enabled for this repository, use that channel.
Otherwise ask the author through her GitHub profile for a private reporting channel
before sharing sensitive details. No response-time or bounty program is promised.

## Português

Use apenas em loopback e com os cenários fictícios internos. Não publique o backend,
não exponha IA paga para visitantes e não envie segredos em issues. Os headers locais
não são autenticação. Para relatar um problema sensível, utilize o canal privado do
GitHub se habilitado, ou combine um canal privado com a autora antes de enviar detalhes.
