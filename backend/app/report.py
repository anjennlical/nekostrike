import json

OWASP = "https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/"


def markdown_report(snapshot: dict) -> str:
    runs, findings = snapshot["runs"], snapshot["findings"]
    lines = ["# NekoStrike - relatório do laboratório", "",
             "Relatório determinístico, sem IA. Escopo: laboratório interno, dados inteiramente fictícios.",
             "Não é uma avaliação de sistemas externos nem uma certificação de segurança.", "",
             f"Execuções: {len(runs)} | Achados: {len(findings)} | Alta: {len(findings)}",
             f"Revisados: {sum(f['review_status'] == 'reviewed' for f in findings)}", "",
             "Cada execução vulnerável gera um achado; repetições não representam vulnerabilidades distintas.", "",
             "## Critério de severidade", "",
             "Alta (qualitativa, restrita ao cenário didático): leitura autenticada de um pedido de outro usuário, "
             "sem autorização por objeto. Impacto demonstrado: confidencialidade. Não foi calculado CVSS.",
             f"Referência: [OWASP API1:2023 - BOLA]({OWASP})", "", "## Execuções", ""]
    if not runs:
        lines.append("Nenhuma execução registrada. Ausência de achados não demonstra segurança.")
    for run in runs:
        lines.extend([f"### Execução {run['id']}",
                      f"Data UTC: {run['created_at']} | Modo: {run['mode']} | Resultado: {run['verdict']}",
                      "", "```json", json.dumps(run["evidence"], ensure_ascii=False, indent=2), "```", ""])
    lines.extend(["## Achados", ""])
    if not findings:
        lines.append("Nenhum achado registrado neste escopo.")
    for finding in findings:
        lines.extend([f"### {finding['title']}", f"ID: {finding['id']} | Execução: {finding['run_id']}",
                      f"Severidade: {finding['severity']} | Revisão: {finding['review_status']}", "",
                      finding["impact"], "", f"Recomendação: {finding['remediation']}", ""])
    lines.extend(["## Limitações", "", "Um único teste de leitura de objeto. Não cobre escrita, exclusão, "
                  "outras funções, autenticação real ou todos os riscos OWASP. Revisado não significa corrigido."])
    return "\n".join(lines) + "\n"
