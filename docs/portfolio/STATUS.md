# Candidate status — 13 November 2026

Functional version **0.4.0**, UI baseline **RC26.1**, portfolio preparation **2.7**.
Frontend frozen. This is a local MVP/release candidate, not production hosting.

## Implemented and tested

- BOLA, data exposure and error-configuration checks: vulnerable/corrected modes,
  controls, qualitative severity and stored evidence.
- SQLite history, finding review, structured AI persistence and separate analysis review.
- Usage metadata when reported, current-result reuse, deterministic Markdown and
  optional saved-analysis appendix.
- **189 automated tests: 126 backend + 63 frontend**, TypeScript/build, Prettier,
  dependency consistency and an isolated six-scenario demo.
- Test databases are temporary and real provider HTTP is blocked by the test harness.
- A separately authorized real BOLA browser flow was technically validated previously.
  Its human semantic review remains pending. It is not included in the public data.

## Not claimed as complete

Full current visual/responsive QA and human acceptance; native reduced-motion and
screen-reader/device checks; frame-rate/CLS analysis; another-machine reproduction;
external backup of the author's data; live AI validation of all three check types.
No test coverage percentage or independent security certification is claimed.

Existing clean screenshots are dated illustrations, not a new RC26.1 browser test.
The local tests do not prove that a production internet deployment would be safe.

## Publication preparation

The public candidate excludes `.env`, the author's SQLite history, local attempt
guards, logs, internal reports/PDFs, personal screenshots, caches, dependencies,
build output and prior ZIPs. The original local Git repository remains preserved.

The publication copy retains the chronological **code history**, original authors,
committers, timestamps and messages. Historical private working documents and media
are omitted from that copy's trees; this changes commit hashes. It is not an exact
mirror of the private working repository. No remote history is overwritten.

No reuse license selected: **rights reserved**. A publication approval must identify
the exact destination, visibility, commit and included files. Source preparation is
not itself a push or an authorization to make the repository public.

## Português

MVP local/candidato de portfólio; frontend congelado no RC26.1. 189 testes automatizados
e verificadores locais aprovados. QA visual completo e aceite humano continuam parciais.
A análise BOLA real foi validada tecnicamente, mas sua revisão humana segue pendente.
Nada aqui declara o backend pronto para hospedagem pública.

A cópia pública preserva o histórico do código com atribuição e datas, retirando dos
seus snapshots antigos os documentos privados. Os hashes mudam; o repositório original
permanece intacto. Sem licença de reutilização. Push e mudança de visibilidade exigem
confirmação final da autora sobre o conteúdo preparado.
