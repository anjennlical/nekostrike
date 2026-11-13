# NekoStrike - relatório do laboratório

Resultados determinísticos do laboratório; apêndice opcional com auxílio de IA. Dados inteiramente fictícios.
Não é uma avaliação de sistemas externos nem uma certificação de segurança.

Execuções: 3 | Achados: 3 | Alta: 1 | Média: 2
Revisados: 0

Cada execução vulnerável gera um achado; repetições não representam vulnerabilidades distintas.

## Critério de severidade

Alta (qualitativa, restrita ao cenário didático): leitura autenticada de um pedido de outro usuário, sem autorização por objeto. Impacto demonstrado: confidencialidade. Não foi calculado CVSS.
Referência: [OWASP API1:2023 - BOLA](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)

Média (qualitativa, restrita ao cenário didático): contato e nota interna expostos em um perfil público. Sem CVSS ou evidência de tomada de conta.
Referência: [OWASP API3:2023 - propriedades do objeto](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/)

Média (configuração insegura, cenário didático): detalhes internos fictícios em resposta de erro. Sem evidência de acesso a arquivos ou execução de comandos; sem CVSS. O HTTP 500 permanece no cenário corrigido, com resposta genérica.
Referência: [OWASP API8:2023 - configuração insegura](https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/)

## Execuções

### Execução 16fc71e0-e52f-41be-9e08-9066608b1d8f
Verificação: security_misconfiguration
Data UTC: 2026-11-13T16:50:42.914612+00:00 | Modo: vulnerable | Resultado: vulnerable

```json
[
  {
    "scenario": "baseline",
    "method": "GET",
    "path": "/lab/status",
    "actor": "anonymous",
    "lab_mode": "fixed",
    "expected_status": 200,
    "status": 200,
    "body": {
      "status": "ok",
      "fixture": true
    }
  },
  {
    "scenario": "error_response",
    "method": "GET",
    "path": "/lab/error",
    "actor": "anonymous",
    "lab_mode": "vulnerable",
    "expected_status": 500,
    "status": 500,
    "body": {
      "detail": "Erro interno no laboratório fictício",
      "debug": {
        "exception": "FixtureError: falha simulada",
        "file": "/fictional/service/orders.py",
        "line": 42
      }
    }
  },
  {
    "scenario": "negative_control",
    "method": "GET",
    "path": "/lab/error",
    "actor": "anonymous",
    "lab_mode": "fixed",
    "expected_status": 500,
    "status": 500,
    "body": {
      "detail": "Erro interno no laboratório fictício"
    }
  }
]
```

### Execução 7439dc25-329f-4b9e-9480-bb9ce264dcfb
Verificação: data_exposure
Data UTC: 2026-11-13T16:50:42.882032+00:00 | Modo: vulnerable | Resultado: vulnerable

```json
[
  {
    "scenario": "baseline",
    "method": "GET",
    "path": "/lab/profiles/alice",
    "actor": "bob",
    "lab_mode": "fixed",
    "expected_status": 200,
    "status": 200,
    "body": {
      "id": "alice",
      "display_name": "Alice Sakura"
    }
  },
  {
    "scenario": "profile_response",
    "method": "GET",
    "path": "/lab/profiles/alice",
    "actor": "bob",
    "lab_mode": "vulnerable",
    "expected_status": 200,
    "status": 200,
    "body": {
      "id": "alice",
      "display_name": "Alice Sakura",
      "email": "alice@example.invalid",
      "internal_note": "FIXTURE: anotação interna, não destinada ao perfil público"
    }
  },
  {
    "scenario": "negative_control",
    "method": "GET",
    "path": "/lab/profiles/alice",
    "actor": "anonymous",
    "lab_mode": "fixed",
    "expected_status": 401,
    "status": 401,
    "body": {
      "detail": "Identidade fictícia necessária"
    }
  }
]
```

### Execução acf4674e-cc5d-46dc-a292-de05e03ed301
Verificação: bola
Data UTC: 2026-11-13T16:50:42.765016+00:00 | Modo: vulnerable | Resultado: vulnerable

```json
[
  {
    "scenario": "baseline",
    "method": "GET",
    "path": "/lab/orders/order-alice",
    "actor": "alice",
    "lab_mode": "vulnerable",
    "expected_status": 200,
    "status": 200,
    "body": {
      "id": "order-alice",
      "owner": "alice",
      "item": "Teclado Sakura",
      "total": 120
    }
  },
  {
    "scenario": "cross_user",
    "method": "GET",
    "path": "/lab/orders/order-bob",
    "actor": "alice",
    "lab_mode": "vulnerable",
    "expected_status": 403,
    "status": 200,
    "body": {
      "id": "order-bob",
      "owner": "bob",
      "item": "Mouse Mochi",
      "total": 80
    }
  },
  {
    "scenario": "negative_control",
    "method": "GET",
    "path": "/lab/orders/order-bob",
    "actor": "alice",
    "lab_mode": "fixed",
    "expected_status": 403,
    "status": 403,
    "body": {
      "detail": "Pedido pertence a outro usuário"
    }
  }
]
```

## Achados

### Configuração insegura: detalhes internos na resposta de erro
ID: f48f7050-3111-4181-85d1-dc668394afd1 | Execução: 16fc71e0-e52f-41be-9e08-9066608b1d8f
Severidade: medium | Revisão: pending

Um cliente anônimo recebeu nome de exceção e caminho de arquivo inteiramente fictícios no campo debug. O cenário demonstra divulgação de detalhes internos.

Critério: Média no cenário didático: divulgação de detalhes internos fictícios, sem evidência de acesso a arquivos, credenciais ou execução de comandos. Sem pontuação CVSS.
Referência: https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/
Recomendação: Retorne um erro genérico ao cliente e valide o esquema da resposta. Restrinja diagnósticos detalhados a logs internos protegidos, sem segredos. Remover detalhes não resolve a falha simulada que originou o erro.

### Exposição de dados: campos privados no perfil público
ID: 2e79a325-051b-4e9c-8ba1-44f5cdd62e28 | Execução: 7439dc25-329f-4b9e-9480-bb9ce264dcfb
Severidade: medium | Revisão: pending

Bob recebeu email e internal_note fictícios ao consultar o perfil público de Alice. Esses campos não pertencem à representação autorizada.

Critério: Média no cenário didático: exposição de contato e nota interna fictícios a outro usuário, sem evidência de escrita ou tomada de conta. Sem pontuação CVSS.
Referência: https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/
Recomendação: Selecione no backend somente id e display_name para o perfil público. Valide o esquema de saída e mantenha testes que rejeitem campos privados. Ocultar campos apenas na interface não corrige a resposta da API.

### BOLA: leitura de pedido de outro usuário
ID: 438e724d-bbca-4d2a-999b-5cc471be7847 | Execução: acf4674e-cc5d-46dc-a292-de05e03ed301
Severidade: high | Revisão: pending

Alice leu o pedido fictício de Bob. A resposta expõe proprietário, item e total, comprometendo a confidencialidade.

Critério: Alta no cenário didático: acesso autenticado a dados de outro usuário sem autorização por objeto. Sem pontuação CVSS.
Referência: https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/
Recomendação: Verifique a autorização do usuário para cada objeto antes de retornar seus dados. Negue o acesso entre proprietários e mantenha testes de regressão.

## Limitações

Testes de leitura de objeto, propriedades de perfil público e detalhes de erro. Não cobre todas as configurações, escrita, exclusão, outras funções, autenticação real ou todos os riscos OWASP. Revisado não significa corrigido.

## Mochi AI — Assisted Analysis

Interpretações com auxílio de IA

Não são validação independente nem parecer técnico definitivo. Revisão humana obrigatória.
Inclui somente a análise salva mais recente de cada achado. Não altera veredito, severidade ou revisão do achado.

### Achado 438e724d-bbca-4d2a-999b-5cc471be7847
Análise: 7a44e809-ee0c-4c95-94bd-fa2d853fb825 | Data: 2026-11-13T16:50:45.983134+00:00
Versão do formato: 1
Execução original: acf4674e-cc5d-46dc-a292-de05e03ed301 | Tipo: bola
Referências compatíveis com o contexto atual do achado.
Revisão da análise: pendente

PROVEDOR SIMULADO DE TESTE — não é resposta de IA real.
Modelo:
> SIMULADO\-SEM\-CUSTO
Consumo: entrada 763; saída 680; total 1443 tokens. Entrada em cache: 0; gravação de cache: não informado; raciocínio: 217 (já incluído na saída). Modalidade efetiva: default. Valores da geração original, não somados novamente ao consultar/exportar. Custo monetário não calculado.

#### Resumo

> SIMULAÇÃO: explicação de teste baseada nas evidências deste laboratório\.

#### Explicação técnica

> O verificador comparou uma resposta vulnerável com controles locais\. Esta resposta foi programada para testar a interface; não foi gerada por IA\.

#### Impacto potencial

> Uma falha equivalente poderia expor informações além do contrato autorizado\.

#### Recomendações da IA

> Revise o controle descrito no achado e compare com o cenário corrigido\.

#### Limitações da IA

> Provedor simulado; não demonstra qualidade de um modelo real\.

> Dados fictícios, teste limitado e revisão humana obrigatória\.

#### Referências conferidas

> acf4674e\-cc5d\-46dc\-a292\-de05e03ed301:baseline \| GET /lab/orders/order\-alice \| alice \| HTTP 200
> acf4674e\-cc5d\-46dc\-a292\-de05e03ed301:cross\_user \| GET /lab/orders/order\-bob \| alice \| HTTP 200
> acf4674e\-cc5d\-46dc\-a292\-de05e03ed301:negative\_control \| GET /lab/orders/order\-bob \| alice \| HTTP 403
