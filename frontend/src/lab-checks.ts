export const labChecks = {
  bola: {
    label: 'BOLA',
    title: 'Um pedido. Dois usuários. Uma fronteira.',
    eyebrow: '01 / AUTORIZAÇÃO DE OBJETOS',
    description:
      'Alice pode ler seu próprio pedido. Mas será que consegue ler o pedido de Bob? Compare o acesso entre usuários no laboratório isolado.',
    lesson:
      'BOLA é uma falha de autorização: estar conectado não deveria permitir ler o pedido de outra pessoa. Aqui, HTTP 200 significa leitura permitida; HTTP 403 significa acesso negado.',
    vulnerable:
      'O laboratório omite a autorização por objeto. A leitura indevida deve gerar um achado com evidência.',
    fixed:
      'A autorização verifica o proprietário. O pedido de Bob deve retornar HTTP 403 e não gerar um achado.',
    vulnerableExpected: 'Alice lê o pedido de Bob e um achado Alta é registrado.',
    fixedExpected: 'A leitura é bloqueada, sem novo achado.',
    vulnerableResult: 'BOLA demonstrada: acesso indevido confirmado.',
    fixedResult: 'Acesso entre usuários bloqueado neste teste.',
  },
  data_exposure: {
    label: 'Exposição de dados',
    title: 'Um perfil público. Só os campos necessários.',
    eyebrow: '02 / PROPRIEDADES DO OBJETO',
    description:
      'Bob pode consultar o perfil público fictício de Alice. A API deveria devolver somente id e display_name. Compare os campos recebidos antes e depois da correção.',
    lesson:
      'HTTP 200 não comprova segurança. Nos dois cenários a resposta chega, mas email e internal_note não deveriam estar nela. Ocultar esses campos na tela não corrige a API.',
    vulnerable:
      'O servidor devolve o perfil completo, incluindo email e internal_note. Os dados são inteiramente fictícios.',
    fixed:
      'O servidor seleciona somente id e display_name. O perfil público continua funcionando, sem os campos privados.',
    vulnerableExpected: 'HTTP 200 com campos privados; um achado Média é registrado.',
    fixedExpected: 'HTTP 200 com somente id e display_name, sem novo achado.',
    vulnerableResult: 'Exposição demonstrada: campos privados na resposta.',
    fixedResult: 'Somente os campos públicos foram retornados neste teste.',
  },
} as const
