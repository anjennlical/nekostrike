# Optional AI / IA opcional

The lab works without a key. Generation defaults to disabled. History lookup,
human review and Markdown export use local storage and do not contact a provider.

## Explicit opt-in

Only after deciding to enable potentially paid provider requests:

1. Copy `.env.example` to `.env` at the repository root **only if `.env` does not exist**.
   Never overwrite an existing credential file as part of setup.
2. In your local editor, set `OPENAI_API_KEY` to your own restricted provider key and
   `MOCHI_AI_MODEL` to a model available to your account that supports Responses and
   structured outputs. Do not paste the key into a terminal command or chat.
3. Review the time, input/output and attempt limits. Set `MOCHI_AI_ENABLED=true` only
   when you accept data transmission and possible charges. Restart your own backend.
4. Inspect configuration in Mochi AI. “Configured” is not a successful connectivity
   check. Select a stored finding, read its evidence, then explicitly request an analysis.
5. Return the setting to `false` and restart when you want to disable generation.

The backend reads the root `.env`; process environment values take precedence.
Never use `VITE_OPENAI_API_KEY` or another frontend variable for secrets.

## What is sent and accepted

The existing backend projects a bounded allowlist of fictional lab facts. It does
not submit arbitrary target URLs, the full database, credentials or raw response bodies.
The official SDK calls `responses.parse` with a Pydantic schema, no tools, no retries,
`store=false` and Standard/default service tier. `store=false` is not a zero-retention guarantee.

References are validated against existing evidence. Verdict and severity remain
those of the deterministic checker. Accepted explanations require human semantic
review; valid JSON and valid IDs do not guarantee correct reasoning.

SQLite stores accepted analyses, source fingerprints, review status and usage
metadata when supplied. A current saved result from the same provider can be reused.
An unreadable history produces an error instead of silently requesting a new paid answer.
If saving fails after a response, the UI reports the storage problem; an in-memory
result is not equivalent to durable persistence.

## Controls and limits

Defaults in `.env.example`: 45-second deadline, 12,000-byte input bound, 4,096 output
tokens and three attempts per process. The service permits one in-flight request,
has a ten-second cooldown and no automatic retries. The input byte limit is not
the full API token count: instructions and schemas also consume input.

Failed attempts count toward the process limit. Restart resets the counter; multiple
workers are unsupported for this guard. These are **not monetary limits**. Configure
provider-account controls independently. Usage may be absent/invalid; subsets such
as cached input and reasoning are not added twice to totals. No automatic currency
cost is inferred. A timeout may still incur provider cost.

## Validation status

One real BOLA browser workflow was technically validated and saved on the author's
machine. Its human interpretation review remains pending. Live validation of the
other checks is not claimed. Private history and that response are not distributed.
The release test suite uses fakes/mock transport and blocks real provider HTTP.

## Português

IA é opcional. Configure `.env` somente no seu computador, preserve arquivos
existentes e habilite geração apenas após decidir sobre custos. Consultar histórico,
revisar e exportar análises salvas não chama a OpenAI. Os limites reiniciam por
processo e não são orçamento financeiro. Schema e referências válidos não dispensam
revisão humana. Não exponha esse backend para usuários externos consumirem créditos.
