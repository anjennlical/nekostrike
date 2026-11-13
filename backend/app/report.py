import json
import html
import re

OWASP = "https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/"


def markdown_report(snapshot: dict, analyses=None) -> str:
    runs, findings = snapshot["runs"], snapshot["findings"]
    lines = ["# NekoStrike - relatório do laboratório", "",
             "Relatório determinístico, sem IA. Escopo: laboratório interno, dados inteiramente fictícios.",
             "Não é uma avaliação de sistemas externos nem uma certificação de segurança.", "",
             f"Execuções: {len(runs)} | Achados: {len(findings)} | Alta: {sum(f['severity'] == 'high' for f in findings)} | Média: {sum(f['severity'] == 'medium' for f in findings)}",
             f"Revisados: {sum(f['review_status'] == 'reviewed' for f in findings)}", "",
             "Cada execução vulnerável gera um achado; repetições não representam vulnerabilidades distintas.", "",
             "## Critério de severidade", "",
             "Alta (qualitativa, restrita ao cenário didático): leitura autenticada de um pedido de outro usuário, "
             "sem autorização por objeto. Impacto demonstrado: confidencialidade. Não foi calculado CVSS.",
             f"Referência: [OWASP API1:2023 - BOLA]({OWASP})", "",
             "Média (qualitativa, restrita ao cenário didático): contato e nota interna expostos em um perfil público. Sem CVSS ou evidência de tomada de conta.",
             "Referência: [OWASP API3:2023 - propriedades do objeto](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/)",
             "",
             "Média (configuração insegura, cenário didático): detalhes internos fictícios em resposta de erro. Sem evidência de acesso a arquivos ou execução de comandos; sem CVSS. O HTTP 500 permanece no cenário corrigido, com resposta genérica.",
             "Referência: [OWASP API8:2023 - configuração insegura](https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/)",
             "", "## Execuções", ""]
    if not runs:
        lines.append("Nenhuma execução registrada. Ausência de achados não demonstra segurança.")
    for run in runs:
        lines.extend([f"### Execução {run['id']}",
                      f"Verificação: {run.get('check_type', 'bola')}",
                      f"Data UTC: {run['created_at']} | Modo: {run['mode']} | Resultado: {run['verdict']}",
                      "", "```json", json.dumps(run["evidence"], ensure_ascii=False, indent=2), "```", ""])
    lines.extend(["## Achados", ""])
    if not findings:
        lines.append("Nenhum achado registrado neste escopo.")
    for finding in findings:
        lines.extend([f"### {finding['title']}", f"ID: {finding['id']} | Execução: {finding['run_id']}",
                      f"Severidade: {finding['severity']} | Revisão: {finding['review_status']}", "",
                      finding["impact"], "", f"Critério: {finding['severity_reason']}",
                      f"Referência: {finding['reference']}", f"Recomendação: {finding['remediation']}", ""])
    lines.extend(["## Limitações", "", "Testes de leitura de objeto, propriedades de perfil público e detalhes de erro. Não cobre todas as configurações, escrita, exclusão, "
                  "outras funções, autenticação real ou todos os riscos OWASP. Revisado não significa corrigido."])
    if analyses is not None:
        # Keep deterministic findings untouched, then clearly label this optional appendix.
        lines[2] = "Resultados determinísticos do laboratório; apêndice opcional com auxílio de IA. Dados inteiramente fictícios."
        lines.extend(["", "## Mochi AI — Assisted Analysis", "", "Interpretações com auxílio de IA", "",
                      "Não são validação independente nem parecer técnico definitivo. Revisão humana obrigatória.",
                      "Inclui somente a análise salva mais recente de cada achado. Não altera veredito, severidade ou revisão do achado.", ""])
        seen = set()
        for result in analyses:
            a, record = result.analysis, result.record
            if a.finding_id in seen:
                continue
            seen.add(a.finding_id)
            lines.extend([f"### Achado {a.finding_id}", f"Análise: {record.id} | Data: {record.created_at}",
                          f"Versão do formato: {result.format_version}",
                          f"Execução original: {record.run_id} | Tipo: {record.check_type}",
                          "ANÁLISE HISTÓRICA: o contexto atual difere do interpretado. As referências abaixo pertencem à execução original." if record.evidence_status == "historical" else "Referências compatíveis com o contexto atual do achado.",
                          f"Revisão da análise: {'revisada' if record.review_status == 'reviewed' else 'pendente'}", "",
                          "PROVEDOR SIMULADO DE TESTE — não é resposta de IA real." if result.provider == "test_double" else "Resposta gerada pela OpenAI.",
                          "Modelo:", safe_ai_text(result.model), consumption_text(result), ""])
            for title, content in [("Resumo", [a.summary]), ("Explicação técnica", [a.technical_explanation]),
                                   ("Impacto potencial", [a.potential_impact]), ("Recomendações da IA", a.recommendations),
                                   ("Limitações da IA", a.limitations)]:
                lines.extend([f"#### {title}", ""])
                for text in content:
                    lines.extend([safe_ai_text(text), ""])
            lines.extend(["#### Referências conferidas", ""])
            for item in a.evidence_used:
                lines.append(safe_ai_text(f"{item.evidence_id} | GET {item.path} | {item.actor} | HTTP {item.status}"))
        if not seen:
            lines.append("Nenhuma análise salva disponível. Nenhuma chamada de IA foi feita para exportar.")
    return "\n".join(lines) + "\n"


def safe_ai_text(value: str) -> str:
    """Untrusted model prose is quoted plain text, never active Markdown/HTML."""
    escaped = re.sub(r"([\\`*_{}\[\]()#+.!|>~-])", r"\\\1", html.escape(value, quote=False))
    return "\n".join("> " + line for line in escaped.splitlines())


def consumption_text(result) -> str:
    metadata = result.consumption
    if metadata is None or metadata.usage is None:
        return "Consumo: não registrado; não significa custo zero. Custo monetário não calculado."
    u = metadata.usage
    detail = lambda value: "não informado" if value is None else str(value)
    return (f"Consumo: entrada {u.input_tokens}; saída {u.output_tokens}; total {u.total_tokens} tokens. "
            f"Entrada em cache: {detail(u.cached_tokens)}; gravação de cache: {detail(u.cache_write_tokens)}; "
            f"raciocínio: {detail(u.reasoning_tokens)} (já incluído na saída). "
            f"Modalidade efetiva: {metadata.service_tier or 'não informada'}. "
            "Valores da geração original, não somados novamente ao consultar/exportar. Custo monetário não calculado.")
