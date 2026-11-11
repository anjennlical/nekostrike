import json

OWASP = "https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/"


def markdown_report(snapshot: dict) -> str:
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
    lines.extend(["## Limitações", "", "Testes de leitura de objeto e propriedades de perfil público. Não cobre escrita, exclusão, "
                  "outras funções, autenticação real ou todos os riscos OWASP. Revisado não significa corrigido."])
    return "\n".join(lines) + "\n"
