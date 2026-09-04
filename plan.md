# API Spec — KFlow (Hono + Zod + Prisma)

Especificação da API necessária para reproduzir o app, derivada do schema final acordado. Cobre DTOs de entrada/saída (Zod), endpoints, middlewares de permissão/escopo e notas de regras de negócio (redigidas como casos de teste).

## Convenções gerais

- **PUT com corpo parcial.** Todo `PUT` aceita um subconjunto dos campos (semântica de `PATCH`) — campos omitidos permanecem inalterados. Todo DTO de update usa `.partial()`.
- **Papéis**: `admin` e `professor`, vindos de `USUARIO.papel`. Um usuário `professor` tem `professorId` preenchido (vínculo com a tabela `PROFESSOR`); um `admin` tem `professorId: null`.
- **camelCase em tudo.** Prisma + banco usam camelCase direto nos nomes de coluna — sem camada de tradução entre API e persistência.
- **Enums como string, não como inteiro.** O banco guarda inteiro (ver legenda no schema), mas a API expõe strings legíveis via `z.enum(...)`. O mapeamento int↔string fica isolado na camada de persistência (ex.: um `@map` do Prisma ou um enum nativo do banco).
- **Escopo por filtragem, nunca por erro.** Quando um `professor` não pode ver dado de outro professor, o dado simplesmente não aparece (lista vazia, ou item específico retorna `404` como se não existisse) — nunca `403`. Isso permite que `admin` e `professor` usem exatamente os mesmos endpoints; só o middleware de escopo muda o resultado.
- **Campos que o backend simplesmente ignora vs. campos que geram erro explícito**: a maioria das restrições de "isso não pode ser editado por aqui" é resolvida deixando o schema Zod não declarar o campo (Zod descarta chave desconhecida por padrão) — sem gerar erro nenhum, porque a UI nunca deveria oferecer esse campo pra edição em primeiro lugar. Só existe uma mensagem de erro explícita e amigável onde documentado (ver seção 5). O restante desses casos está listado no apêndice final, "Erros preveníveis pela UI".
- Sem paginação por agora — todas as listagens retornam o conjunto completo.

## Middlewares

```ts
// Contexto tipado do Hono — é exatamente o mecanismo que resolve
// "identificar o usuário atual a partir do token, compartilhado durante a request".
// authMiddleware roda uma vez, decodifica o token, e faz c.set('usuario', ...).
// Qualquer middleware/handler depois dele, na mesma request, lê com c.get('usuario').

type AuthContext = {
  id: string;
  papel: "admin" | "professor";
  professorId: string | null;
};

type Env = { Variables: { usuario: AuthContext } };

const app = new Hono<Env>();

const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const usuario = await decodificarToken(c.req.header("authorization"));
  c.set("usuario", usuario);
  await next();
});

// uso em qualquer handler/middleware seguinte:
// const usuario = c.get('usuario');
```

```ts
// scopeToProfessor — aplica-se a ALUNO, MATRICULA, MATRICULA_HORARIO, REGISTRO_AULA, AGENDA, PAINEL.
// Se papel === 'professor', injeta professorId = usuario.professorId no filtro da query,
// ignorando qualquer professorId vindo por querystring. Se papel === 'admin', não filtra nada.
// Efeito em listas: item de outro professor nunca aparece.
// Efeito em GET por id: item de outro professor -> 404.

// restrictProfessorSelf — usado só em PUT /professores/:id.
// papel === 'admin' -> valida contra o schema completo.
// papel === 'professor' && params.id === usuario.professorId -> valida contra o schema restrito
//   (campos fora dele são descartados pelo Zod, sem erro).
// papel === 'professor' && params.id !== usuario.professorId -> 403
//   (aqui é permissão de escrita em registro alheio, não visibilidade — erro explícito é correto).

// requireAdmin — usado nas rotas admin-only (criar professor, matéria, conteúdo, usuário etc.)
```

---

## 1. Autenticação e usuários

Fluxo simples: só admin cria usuário; usuário nasce com uma senha padrão no banco que **nunca é um hash válido** (então login com ela sempre falha) — a única forma de entrar é resetando a senha por um link com token.

### DTOs

```ts
export const PapelEnum = z.enum(["admin", "professor"]);

export const LoginInput = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export const UsuarioOutput = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  email: z.string().email(),
  papel: PapelEnum,
  ativo: z.boolean(),
  professorId: z.string().uuid().nullable(),
});

export const LoginOutput = z.object({
  token: z.string(),
  usuario: UsuarioOutput,
});

// sem campo de senha — ela nasce com um placeholder não-validável no banco
export const UsuarioCreateInput = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  papel: PapelEnum,
  professorId: z.string().uuid().optional(), // obrigatório se papel === 'professor'
});

export const UsuarioUpdateInput = z
  .object({
    papel: PapelEnum.optional(),
    ativo: z.boolean().optional(),
  })
  .partial(); // admin apenas — nunca inclui senha

export const SolicitarResetInput = z.object({
  email: z.string().email(),
});

export const ResetarSenhaInput = z.object({
  token: z.string(),
  novaSenha: z.string().min(8),
});
```

### Endpoints

| Método | Rota                    | Papel    | Input                 | Output          |
| ------ | ----------------------- | -------- | --------------------- | --------------- |
| POST   | `/auth/login`           | público  | `LoginInput`          | `LoginOutput`   |
| GET    | `/me`                   | qualquer | —                     | `UsuarioOutput` |
| POST   | `/usuarios`             | admin    | `UsuarioCreateInput`  | `UsuarioOutput` |
| PUT    | `/usuarios/:id`         | admin    | `UsuarioUpdateInput`  | `UsuarioOutput` |
| POST   | `/auth/solicitar-reset` | público  | `SolicitarResetInput` | `204`           |
| POST   | `/auth/resetar-senha`   | público  | `ResetarSenhaInput`   | `204`           |

### Regras de negócio / testes

- `POST /usuarios` grava a senha como um valor que nunca bate com nenhum hash real (ex.: string vazia ou um marcador fixo) — login com esse usuário deve falhar sempre, até o primeiro reset.
- `POST /auth/solicitar-reset` sempre responde `204`, exista ou não o email — não revela quais emails têm conta.
- `POST /auth/solicitar-reset` gera/rotaciona um token de reset e tenta disparar o email; se não houver provedor de email configurado (variável de ambiente ausente), o envio é **no-op silencioso** — não falha a request. Em desenvolvimento, o token gerado é logado no console do servidor, pra dar pra copiar manualmente e montar a URL de reset sem precisar de email de verdade.
- `POST /auth/resetar-senha` com token inválido ou expirado → `400`. Token é de uso único — depois de resetar com sucesso, o mesmo token não funciona de novo.
- Não existe endpoint de "trocar senha logado" separado — resetar é o único caminho, inclusive para quem já tem senha e só quer trocar (basta solicitar reset pra si mesmo).
- `PUT /usuarios/:id` nunca aceita senha em nenhuma forma — reforçado pelo próprio schema não ter esse campo.

---

## 2. Professores

### DTOs

```ts
export const DiaSemanaEnum = z.enum([
  "dom",
  "seg",
  "ter",
  "qua",
  "qui",
  "sex",
  "sab",
]);

export const ProfessorOutput = z.object({
  id: z.string().uuid(),
  usuarioId: z.string().uuid().nullable(),
  nome: z.string(),
  telefone: z.string().nullable(),
  email: z.string().email().nullable(),
  photoUrl: z.string().url().nullable(),
  diasDisponiveis: z.array(DiaSemanaEnum),
  horarioInicial: z.string(), // "HH:mm"
  horarioFinal: z.string(),
  capacidadePorHorario: z.number().int(),
  duracaoAulaMin: z.number().int(),
  corAgenda: z.string(),
  observacoes: z.string().nullable(),
  materiaIds: z.array(z.string().uuid()),
});

export const ProfessorCreateInput = z.object({
  nome: z.string().min(1),
  telefone: z.string().optional(),
  email: z.string().email().optional(),
  photoUrl: z.string().url().optional(),
  diasDisponiveis: z.array(DiaSemanaEnum).min(1),
  horarioInicial: z.string(),
  horarioFinal: z.string(),
  capacidadePorHorario: z.number().int().positive(),
  duracaoAulaMin: z.number().int().positive(),
  corAgenda: z.string(),
  observacoes: z.string().optional(),
  materiaIds: z.array(z.string().uuid()).min(1),
});

export const ProfessorUpdateInputAdmin = ProfessorCreateInput.partial();

// professor editando a si mesmo: schema simplesmente não declara os outros campos.
// Se vierem no corpo (ex.: capacidadePorHorario), o Zod descarta silenciosamente — sem erro.
// A UI é quem garante, na prática, que esses campos nunca sejam exibidos como editáveis.
export const ProfessorUpdateInputSelf = z
  .object({
    telefone: z.string().optional(),
    email: z.string().email().optional(),
    photoUrl: z.string().url().optional(),
    observacoes: z.string().optional(),
  })
  .partial();
```

### Endpoints

| Método | Rota               | Papel         | Input                                                     | Output              |
| ------ | ------------------ | ------------- | --------------------------------------------------------- | ------------------- |
| GET    | `/professores`     | qualquer      | —                                                         | `ProfessorOutput[]` |
| GET    | `/professores/:id` | qualquer      | —                                                         | `ProfessorOutput`   |
| POST   | `/professores`     | admin         | `ProfessorCreateInput`                                    | `ProfessorOutput`   |
| PUT    | `/professores/:id` | admin ou self | `ProfessorUpdateInputAdmin` \| `ProfessorUpdateInputSelf` | `ProfessorOutput`   |

### Regras de negócio / testes

- `GET /professores` **não é filtrado por escopo** — é diretório de equipe, visível pra qualquer papel autenticado.
- `PUT /professores/:id` com `papel=professor` e `params.id === usuario.professorId`, corpo contendo `capacidadePorHorario` → o campo é silenciosamente descartado, resposta `200` normal com o resto do que foi aceito. Não é erro.
- `PUT /professores/:id` com `papel=professor` e `params.id !== usuario.professorId` → `403` (edição de registro alheio, não é caso de filtragem).
- `POST /professores` deve rejeitar (`400`) `materiaIds` contendo um id de matéria com `ativo: false`.

---

## 3. Matérias e conteúdos

CRUD simples, com soft-delete (`ativo`) em vez de `DELETE` físico — protege `MATRICULA`/`REGISTRO_AULA_CONTEUDO` que referenciam essas linhas historicamente.

### DTOs

```ts
export const MateriaOutput = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  ativo: z.boolean(),
});

export const MateriaCreateInput = z.object({ nome: z.string().min(1) });
export const MateriaUpdateInput = z
  .object({
    nome: z.string().min(1).optional(),
    ativo: z.boolean().optional(),
  })
  .partial();

export const ConteudoOutput = z.object({
  id: z.string().uuid(),
  materiaId: z.string().uuid(),
  nome: z.string(),
  ativo: z.boolean(),
});

export const ConteudoCreateInput = z.object({
  materiaId: z.string().uuid(),
  nome: z.string().min(1),
});
export const ConteudoUpdateInput = ConteudoCreateInput.partial();
```

### Endpoints

| Método | Rota                      | Papel    | Input                 | Output             |
| ------ | ------------------------- | -------- | --------------------- | ------------------ |
| GET    | `/materias`               | qualquer | —                     | `MateriaOutput[]`  |
| POST   | `/materias`               | admin    | `MateriaCreateInput`  | `MateriaOutput`    |
| PUT    | `/materias/:id`           | admin    | `MateriaUpdateInput`  | `MateriaOutput`    |
| GET    | `/materias/:id/conteudos` | qualquer | —                     | `ConteudoOutput[]` |
| POST   | `/conteudos`              | admin    | `ConteudoCreateInput` | `ConteudoOutput`   |
| PUT    | `/conteudos/:id`          | admin    | `ConteudoUpdateInput` | `ConteudoOutput`   |

### Regras de negócio / testes

- Não existe `DELETE` em nenhuma das duas — desativação é sempre `PUT { ativo: false }`.
- `GET /materias` por padrão retorna só `ativo: true`; aceitar `?incluirInativas=true` pra telas administrativas.
- `POST /conteudos` deve rejeitar (`400`) se `materiaId` não existir ou estiver `ativo: false`.
- Desativar uma matéria não desativa seus conteúdos em cascata automaticamente.

---

## 4. Alunos

### DTOs

```ts
export const SituacaoAlunoEnum = z.enum(["ativo", "trancado", "desistente"]);

export const AlunoOutput = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  responsavel: z.string().nullable(),
  telefone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  email: z.string().email().nullable(),
  dataNascimento: z.string().nullable(),
  observacoes: z.string().nullable(),
  dataMatricula: z.string(),
  situacao: SituacaoAlunoEnum,
  zonaVermelha: z.boolean(),
  connect: z.boolean(),
});

export const AlunoCreateInput = z.object({
  nome: z.string().min(1),
  responsavel: z.string().optional(),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  dataNascimento: z.string().optional(),
  observacoes: z.string().optional(),
  dataMatricula: z.string(),
  situacao: SituacaoAlunoEnum.default("ativo"),
  zonaVermelha: z.boolean().default(false),
  connect: z.boolean().default(false),
});

export const AlunoUpdateInput = AlunoCreateInput.partial();
```

### Endpoints

| Método | Rota          | Papel                      | Input              | Output          |
| ------ | ------------- | -------------------------- | ------------------ | --------------- |
| GET    | `/alunos`     | qualquer (escopo aplicado) | —                  | `AlunoOutput[]` |
| GET    | `/alunos/:id` | qualquer (escopo aplicado) | —                  | `AlunoOutput`   |
| POST   | `/alunos`     | admin                      | `AlunoCreateInput` | `AlunoOutput`   |
| PUT    | `/alunos/:id` | admin                      | `AlunoUpdateInput` | `AlunoOutput`   |

### Regras de negócio / testes

- `scopeToProfessor` em `GET /alunos`: quando `papel=professor`, o filtro é "aluno tem ao menos uma `MATRICULA` ativa com `professorId = usuario.professorId`" — via `EXISTS`, não via join que duplicaria linhas.
- `GET /alunos/:id` com `papel=professor` pedindo aluno de outro professor → `404`.
- `PUT /alunos/:id` é admin-only, mesmo para o professor "dono" do aluno.
- Criar aluno não cria matrícula — fluxos separados (seção 5).

---

## 5. Matrículas

### DTOs

```ts
export const TipoAtendimentoEnum = z.enum(["regular", "pre_escolar"]);
export const SituacaoMatriculaEnum = z.enum(["ativa", "pausada", "encerrada"]);

export const MatriculaOutput = z.object({
  id: z.string().uuid(),
  alunoId: z.string().uuid(),
  professorId: z.string().uuid(),
  materiaId: z.string().uuid(),
  estagio: z.string().nullable(),
  tipoAtendimento: TipoAtendimentoEnum,
  situacao: SituacaoMatriculaEnum,
  observacoes: z.string().nullable(),
});

export const MatriculaCreateInput = z.object({
  professorId: z.string().uuid(),
  materiaId: z.string().uuid(),
  estagio: z.string().optional(),
  tipoAtendimento: TipoAtendimentoEnum,
  observacoes: z.string().optional(),
});

// professorId e materiaId não existem neste schema de propósito — ver regra abaixo
export const MatriculaUpdateInput = z
  .object({
    estagio: z.string().optional(),
    tipoAtendimento: TipoAtendimentoEnum.optional(),
    situacao: SituacaoMatriculaEnum.optional(),
    observacoes: z.string().optional(),
  })
  .partial();
```

### Endpoints

| Método | Rota                          | Papel                      | Input                  | Output              |
| ------ | ----------------------------- | -------------------------- | ---------------------- | ------------------- |
| GET    | `/alunos/:alunoId/matriculas` | qualquer (escopo aplicado) | —                      | `MatriculaOutput[]` |
| POST   | `/alunos/:alunoId/matriculas` | admin                      | `MatriculaCreateInput` | `MatriculaOutput`   |
| PUT    | `/matriculas/:id`             | admin                      | `MatriculaUpdateInput` | `MatriculaOutput`   |

Não existe um endpoint dedicado de "transferir". Trocar professor ou matéria de um aluno é, literalmente, a composição de duas chamadas que já existem:

1. `PUT /matriculas/:idAntiga` com `{ situacao: 'encerrada' }`
2. `POST /alunos/:alunoId/matriculas` com o professor/matéria novos

### Regras de negócio / testes

- `PUT /matriculas/:id` **não aceita** `professorId`/`materiaId` — não trocar professor/matéria de uma matrícula existente por aqui (o caminho é encerrar + criar nova, abaixo). `MatriculaUpdateInput` nem declara esses campos, então o Zod os descarta em silêncio se vierem no corpo — sem `422` explícito; é responsabilidade da UI não enviá-los (ex.: desabilitando-os no formulário de edição), já que o único cliente da API é o próprio front.
- Ordem recomendada pro fluxo de troca: **encerrar a antiga primeiro, depois criar a nova** — porque `POST` rejeita (`400`) criar uma segunda matrícula `ativa` pra mesma `alunoId` + `materiaId`. Isso deixa uma janela real (ainda que pequena) em que, se o segundo passo falhar, o aluno fica sem matrícula ativa daquela matéria até alguém tentar de novo — não é uma transação atômica entre as duas chamadas. Vale a pena o frontend tratar essa falha mostrando claramente "a matrícula antiga foi encerrada mas a nova não foi criada, tente de novo" em vez de simplesmente reportar um erro genérico.
- A nova matrícula **não herda automaticamente os horários** (`MATRICULA_HORARIO`) da antiga — nasce sem nenhum, forçando recadastro. Vale confirmar com a equipe se faz mais sentido copiar os horários da antiga e deixar quem transferiu só ajustar o que mudou.
- `GET /alunos/:alunoId/matriculas` com `papel=professor` só retorna matrículas onde `professorId = usuario.professorId`.

---

## 6. Horários semanais (matrícula_horário)

### DTOs

```ts
export const HorarioOutput = z.object({
  id: z.string().uuid(),
  matriculaId: z.string().uuid(),
  diaSemana: DiaSemanaEnum,
  horario: z.string(), // "HH:mm", só em intervalos de 30 min (regex compartilhado, ver seção 6)
  ativo: z.boolean(),
});

export const HorarioCreateInput = z.object({
  diaSemana: DiaSemanaEnum,
  horario: z.string(), // "HH:mm", só em intervalos de 30 min
});

// diaSemana/horario não existem neste schema — só ativo é editável em uma linha existente.
// Se vierem no corpo mesmo assim, o Zod descarta silenciosamente.
export const HorarioUpdateInput = z
  .object({
    ativo: z.boolean().optional(),
  })
  .partial();
```

### Endpoints

| Método | Rota                                | Papel                      | Input                | Output            |
| ------ | ----------------------------------- | -------------------------- | -------------------- | ----------------- |
| GET    | `/matriculas/:matriculaId/horarios` | qualquer (escopo aplicado) | —                    | `HorarioOutput[]` |
| POST   | `/matriculas/:matriculaId/horarios` | admin                      | `HorarioCreateInput` | `HorarioOutput`   |
| PUT    | `/horarios/:id`                     | admin                      | `HorarioUpdateInput` | `HorarioOutput`   |

### Regras de negócio / testes

- `PUT /horarios/:id` com corpo contendo `diaSemana` — o campo é descartado, sem erro; resposta normal só aplicando `ativo` se veio.
- Trocar dia/horário, na prática, é `POST` um novo (`HorarioCreateInput`) + `PUT { ativo: false }` no antigo — duas chamadas, mesmo padrão do que ficou decidido pra matrícula.
- `POST /matriculas/:matriculaId/horarios` deve rejeitar (`409`) se já existir um horário `ativo` na mesma `matriculaId` + `diaSemana` + `horario` exatos.
- `horario` fora do formato `HH:mm` em `:00`/`:30` → `400` (validação de formato, não de horário de expediente do professor).

---

## 7. Registro de aula

A lista do dia é **computada** (nunca gera linha sozinha), e o registro em si é uma única entidade que aceita atualização progressiva — sem duas rotas rígidas nem validação de "isso só pode ser preenchido se chegada = presente". A lógica de esconder/mostrar o restante do formulário é responsabilidade da UI; o backend só persiste o que chega.

### DTOs

```ts
export const StatusRegistroEnum = z.enum([
  "nao_iniciado",
  "em_andamento",
  "concluido",
]);
export const ChegadaEnum = z.enum(["presente", "atrasado", "faltou"]);
export const BoletimEnum = z.enum(["pegou", "nao_pegou", "problema"]);
export const AtividadeCasaEnum = z.enum([
  "fez",
  "fez_parcialmente",
  "nao_fez",
  "nao_havia",
]);
export const FocoEnum = z.enum(["baixo", "regular", "bom", "excelente"]);
export const AutonomiaEnum = z.enum(["baixa", "regular", "boa", "excelente"]);
export const ComportamentoEnum = z.enum([
  "necessitou_intervencao",
  "oscilou",
  "adequado",
  "excelente",
]);
export const DesempenhoEnum = z.enum([
  "precisou_intervencao",
  "apresentou_dificuldade",
  "bom",
  "excelente",
]);

// retornado por GET /registros (lista do dia) e reaproveitado dentro de RegistroDetalheOutput
export const RegistroResumoOutput = z.object({
  id: z.string().uuid().nullable(), // null = ainda não existe linha, é virtual
  horarioId: z.string().uuid(),
  matriculaId: z.string().uuid(),
  alunoId: z.string().uuid(),
  alunoNome: z.string(),
  professorId: z.string().uuid(),
  materiaId: z.string().uuid(),
  data: z.string(),
  horarioPrevisto: z.string(),
  status: StatusRegistroEnum,
});

// retornado por GET /registros/:id e pelos endpoints de criação/atualização
export const RegistroDetalheOutput = RegistroResumoOutput.extend({
  estagio: z.string().nullable(),
  chegada: ChegadaEnum.nullable(),
  boletim: BoletimEnum.nullable(),
  atividadeCasa: AtividadeCasaEnum.nullable(),
  foco: FocoEnum.nullable(),
  autonomia: AutonomiaEnum.nullable(),
  comportamento: ComportamentoEnum.nullable(),
  desempenho: DesempenhoEnum.nullable(),
  conteudoIds: z.array(z.string().uuid()),
  anotacao: z.string().nullable(),
  fechado: z.boolean(),
  horaInicio: z.string().nullable(),
  horaFim: z.string().nullable(),
  duracaoMin: z.number().int().nullable(),
});

// um único formato de entrada, usado tanto na criação quanto em cada auto-save.
// tudo opcional exceto o mínimo pra criar a linha na primeira chamada.
export const RegistroInput = z.object({
  horarioId: z.string().uuid(),
  data: z.string(),
  chegada: ChegadaEnum.optional(),
  boletim: BoletimEnum.optional(),
  atividadeCasa: AtividadeCasaEnum.optional(),
  foco: FocoEnum.optional(),
  autonomia: AutonomiaEnum.optional(),
  comportamento: ComportamentoEnum.optional(),
  desempenho: DesempenhoEnum.optional(),
  conteudoIds: z.array(z.string().uuid()).optional(),
  anotacao: z.string().optional(),
});

// PUT reaproveita o mesmo shape, sem horarioId/data (não mudam depois de criado)
export const RegistroUpdateInput = RegistroInput.omit({
  horarioId: true,
  data: true,
}).partial();
```

### Endpoints

| Método | Rota                         | Papel                      | Input                 | Output                   |
| ------ | ---------------------------- | -------------------------- | --------------------- | ------------------------ |
| GET    | `/registros?data=YYYY-MM-DD` | qualquer (escopo aplicado) | —                     | `RegistroResumoOutput[]` |
| GET    | `/registros/:id`             | qualquer (escopo aplicado) | —                     | `RegistroDetalheOutput`  |
| POST   | `/registros`                 | admin ou professor dono    | `RegistroInput`       | `RegistroDetalheOutput`  |
| PUT    | `/registros/:id`             | admin ou professor dono    | `RegistroUpdateInput` | `RegistroDetalheOutput`  |
| POST   | `/registros/:id/finalizar`   | admin ou professor dono    | —                     | `RegistroDetalheOutput`  |

### Exemplo de wiring (Hono + Zod)

```ts
app.put(
  "/registros/:id",
  authMiddleware,
  scopeToProfessor("registro_aula"),
  zValidator("json", RegistroUpdateInput),
  async (c) => {
    const registro = await buscarRegistroOuFalhar(
      c.req.param("id"),
      c.get("usuario"),
    );
    const dados = c.req.valid("json");
    // sem checagem de chegada aqui — o que veio, persiste; a UI que decide o que mostra
    const atualizado = await atualizarRegistro(registro.id, dados);
    return c.json(RegistroDetalheOutput.parse(atualizado));
  },
);
```

### Regras de negócio / testes

- `GET /registros?data=X` nunca cria linha nenhuma — `LEFT JOIN` entre `MATRICULA_HORARIO` (`ativo=true`, `diaSemana` batendo com o dia da semana de `X`) e `REGISTRO_AULA` existente pra aquela `data`. Sem linha → `id: null`, `status: 'nao_iniciado'`.
- `status` nunca vem em nenhum input — é sempre derivado no backend na hora de montar o output: sem linha → `nao_iniciado`; linha existe e `fechado=false` → `em_andamento`; `fechado=true` → `concluido`.
- `POST /registros` com `chegada: 'atrasado'` ou `'faltou'` — o endpoint só salva o que veio; se por algum motivo vierem também campos de detalhe (`boletim`, `foco` etc.) junto nesse mesmo payload, eles são simplesmente persistidos também, sem checagem de coerência. Não é uma configuração esperada (a UI não deveria enviar isso), mas o backend não trata como erro.
- `POST /registros` duplicado pro mesmo `(horarioId, data)` → `409` (constraint única no banco — essa sim é uma checagem de integridade real, mantida independente da UI).
- `estagio` nunca vem em `RegistroInput` nem `RegistroUpdateInput` — o backend copia de `MATRICULA.estagio` automaticamente no momento do `POST`. É a única cópia (snapshot) intencional no schema.
- `POST /registros/:id/finalizar` grava `horaFim = now()` e `duracaoMin`; deve ser idempotente — chamar duas vezes não recalcula a duração pela segunda `now()`.
- Editar um registro já com `fechado=true` via `PUT` não é bloqueado pelo backend — é convenção de UI (form fica read-only depois de "Finalizar aula"). Ver apêndice final.
- `scopeToProfessor` filtra pelo `professorId` da `MATRICULA` associada ao `horarioId`/`matriculaId` do registro — professor pedindo `horarioId` de outro professor em `POST /registros` → o `horarioId` "não existe" pra ele (`404`/`400` de referência inválida, não `403`).

---

## 8. Agenda (vistas computadas)

### DTOs

```ts
export const AgendaSlotOutput = z.object({
  horarioId: z.string().uuid(),
  diaSemana: DiaSemanaEnum,
  horario: z.string(),
  matriculaId: z.string().uuid(),
  alunoId: z.string().uuid(),
  alunoNome: z.string(),
  professorId: z.string().uuid(),
  professorNome: z.string(),
  materiaId: z.string().uuid(),
});
```

### Endpoints

| Método | Rota                   | Papel                      | Input | Output               |
| ------ | ---------------------- | -------------------------- | ----- | -------------------- |
| GET    | `/agenda?professorId=` | qualquer (escopo aplicado) | —     | `AgendaSlotOutput[]` |
| GET    | `/alunos/:id/agenda`   | qualquer (escopo aplicado) | —     | `AgendaSlotOutput[]` |

### Regras de negócio / testes

- `GET /agenda?professorId=X` com `papel=professor` ignora o `professorId` da querystring e força o próprio.
- Ambos retornam só `MATRICULA_HORARIO.ativo = true`.

---

## 9. Painel

### DTOs

```ts
export const PainelOutput = z.object({
  totalAlunosAtivos: z.number().int(),
  totalMatriculasAtivas: z.number().int(),
  totalProfessores: z.number().int(),
  ocupacaoPercentual: z.number(),
  matriculasPorMateria: z.array(
    z.object({
      materiaId: z.string().uuid(),
      materiaNome: z.string(),
      total: z.number().int(),
    }),
  ),
  aulasPorDiaSemana: z.array(
    z.object({
      diaSemana: DiaSemanaEnum,
      total: z.number().int(),
    }),
  ),
  alertas: z.array(
    z.object({
      tipo: z.string(),
      alunoId: z.string().uuid().optional(),
      mensagem: z.string(),
    }),
  ),
});
```

### Endpoints

| Método | Rota      | Papel                      | Input | Output         |
| ------ | --------- | -------------------------- | ----- | -------------- |
| GET    | `/painel` | qualquer (escopo aplicado) | —     | `PainelOutput` |

### Regras de negócio / testes

- Com `papel=admin`: agregações cruzam toda a unidade.
- Com `papel=professor`: mesmo shape, tudo filtrado por `professorId = usuario.professorId` primeiro — vale decidir se `totalProfessores` faz sentido nessa visão ou se deveria ser omitido pro professor.
- `alertas` também é escopado: professor só vê alertas dos próprios alunos.

---

## Erros preveníveis pela UI

Casos que existem por causa da forma do produto, não por regra de integridade — a defesa real é desabilitar/esconder o controle na tela, e o backend foi deliberadamente deixado leniente (sem `.strict()`, sem checagem extra) nesses pontos, porque adicionar validação rígida ali só duplicaria uma garantia que já devia existir na UI:

| Cenário                                                      | Onde a UI previne                                                                         | Comportamento do backend                                         |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Professor tentando editar disponibilidade/capacidade própria | Campos não aparecem editáveis na tela de perfil do professor                              | Ignora silenciosamente os campos fora do escopo permitido        |
| Editar dia/horário de um horário existente                   | Só existe um toggle de ativo na UI; trocar dia/hora sempre passa por "criar novo horário" | Ignora silenciosamente `diaSemana`/`horario` num `PUT`           |
| Preencher boletim/foco/etc. quando chegada ≠ presente        | Formulário de detalhe só renderiza depois de marcar "Presente"                            | Aceita e persiste o que vier, sem checar coerência com `chegada` |
| Editar um registro depois de "Finalizar aula"                | Formulário vira somente-leitura depois do clique em finalizar                             | Não bloqueia tecnicamente — se for chamado, aplica a mudança     |

Casos parecidos, mas onde o backend **mantém** uma checagem mesmo com a UI prevenindo, porque envolvem corrida de dados (duas abas, duas pessoas) ou segurança de credencial, não só forma de formulário:

| Cenário                                                     | Por que mantém checagem no backend                                                                                   |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Duas matrículas `ativa` pra mesmo aluno+matéria             | Dois admins podem criar ao mesmo tempo em telas diferentes — `400` na segunda tentativa                              |
| Dois horários idênticos (mesma matrícula+dia+hora)          | Mesma razão — `409` via constraint única                                                                             |
| Trocar `professorId`/`materiaId` de uma matrícula via `PUT` | Não é só forma de UI, é regra de integridade histórica (ver seção 5) — `422` com mensagem explicando o caminho certo |
| Usuário não-admin acessando rotas de gestão de usuário      | Dado sensível de credencial — `403` real, mesmo que a UI nem mostre a tela pra esse papel                            |

---

## Schema Prisma completo

Traduz o ERD final acordado em `schema.prisma`. Usa enums nativos do Postgres (via Prisma) em vez de inteiro cru + mapa manual no código — o Postgres já guarda enum de forma compacta, e o Prisma já gera o tipo string tipado sozinho, então a dúvida antiga de "int no banco, string na API" se resolve de graça, sem camada de tradução escrita à mão.

Duas adições que não vieram de nenhuma decisão anterior, adicionadas por padrão de mercado (documentando pra não parecer decisão escondida): `criadoEm`/`atualizadoEm` nas tabelas centrais, e um punhado de `@@index` nos campos mais filtrados (escopo por professor, filtro por data).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Papel {
  ADMIN
  PROFESSOR
}

enum DiaSemana {
  DOM
  SEG
  TER
  QUA
  QUI
  SEX
  SAB
}

enum SituacaoAluno {
  ATIVO
  TRANCADO
  DESISTENTE
}

enum TipoAtendimento {
  REGULAR
  PRE_ESCOLAR
}

enum SituacaoMatricula {
  ATIVA
  PAUSADA
  ENCERRADA
}

enum Chegada {
  PRESENTE
  ATRASADO
  FALTOU
}

enum Boletim {
  PEGOU
  NAO_PEGOU
  PROBLEMA
}

enum AtividadeCasa {
  FEZ
  FEZ_PARCIALMENTE
  NAO_FEZ
  NAO_HAVIA
}

enum Foco {
  BAIXO
  REGULAR
  BOM
  EXCELENTE
}

enum Autonomia {
  BAIXA
  REGULAR
  BOA
  EXCELENTE
}

enum Comportamento {
  NECESSITOU_INTERVENCAO
  OSCILOU
  ADEQUADO
  EXCELENTE
}

enum Desempenho {
  PRECISOU_INTERVENCAO
  APRESENTOU_DIFICULDADE
  BOM
  EXCELENTE
}

model Usuario {
  id                 String    @id @default(uuid())
  nome               String
  email              String    @unique
  senhaHash          String
  papel              Papel
  ativo              Boolean   @default(true)
  resetTokenHash     String?
  resetTokenExpiraEm DateTime?
  criadoEm           DateTime  @default(now())
  atualizadoEm       DateTime  @updatedAt
  professor          Professor?

  @@map("usuarios")
}

model Professor {
  id                   String             @id @default(uuid())
  usuarioId            String?            @unique
  usuario              Usuario?           @relation(fields: [usuarioId], references: [id])
  nome                 String
  telefone             String?
  email                String?
  photoUrl             String?
  diasDisponiveis      DiaSemana[]
  horarioInicial       String
  horarioFinal         String
  capacidadePorHorario Int
  duracaoAulaMin       Int
  corAgenda            String
  observacoes          String?
  criadoEm             DateTime           @default(now())
  atualizadoEm         DateTime           @updatedAt
  materias             ProfessorMateria[]
  matriculas           Matricula[]

  @@map("professores")
}

model Materia {
  id          String             @id @default(uuid())
  nome        String
  ativo       Boolean            @default(true)
  conteudos   Conteudo[]
  matriculas  Matricula[]
  professores ProfessorMateria[]

  @@map("materias")
}

model Conteudo {
  id        String                 @id @default(uuid())
  materiaId String
  materia   Materia                @relation(fields: [materiaId], references: [id])
  nome      String
  ativo     Boolean                @default(true)
  registros RegistroAulaConteudo[]

  @@index([materiaId])
  @@map("conteudos")
}

model ProfessorMateria {
  professorId String
  materiaId   String
  professor   Professor @relation(fields: [professorId], references: [id])
  materia     Materia   @relation(fields: [materiaId], references: [id])

  @@id([professorId, materiaId])
  @@map("professor_materia")
}

model Aluno {
  id             String        @id @default(uuid())
  nome           String
  responsavel    String?
  telefone       String?
  whatsapp       String?
  email          String?
  dataNascimento DateTime?
  observacoes    String?
  dataMatricula  DateTime
  situacao       SituacaoAluno @default(ATIVO)
  zonaVermelha   Boolean       @default(false)
  connect        Boolean       @default(false)
  criadoEm       DateTime      @default(now())
  atualizadoEm   DateTime      @updatedAt
  matriculas     Matricula[]

  @@map("alunos")
}

model Matricula {
  id              String            @id @default(uuid())
  alunoId         String
  aluno           Aluno             @relation(fields: [alunoId], references: [id])
  professorId     String
  professor       Professor         @relation(fields: [professorId], references: [id])
  materiaId       String
  materia         Materia           @relation(fields: [materiaId], references: [id])
  estagio         String?
  tipoAtendimento TipoAtendimento
  situacao        SituacaoMatricula @default(ATIVA)
  observacoes     String?
  criadoEm        DateTime          @default(now())
  atualizadoEm    DateTime          @updatedAt
  horarios        MatriculaHorario[]
  registros       RegistroAula[]

  @@index([professorId])
  @@index([alunoId])
  @@map("matriculas")
}

model MatriculaHorario {
  id          String         @id @default(uuid())
  matriculaId String
  matricula   Matricula      @relation(fields: [matriculaId], references: [id])
  diaSemana   DiaSemana
  horario     String
  ativo       Boolean        @default(true)
  criadoEm    DateTime       @default(now())
  registros   RegistroAula[]

  @@index([matriculaId])
  @@map("matricula_horarios")
}

model RegistroAula {
  id            String                 @id @default(uuid())
  horarioId     String
  horario       MatriculaHorario       @relation(fields: [horarioId], references: [id])
  matriculaId   String
  matricula     Matricula              @relation(fields: [matriculaId], references: [id])
  data          DateTime
  estagio       String?
  chegada       Chegada?
  boletim       Boletim?
  atividadeCasa AtividadeCasa?
  foco          Foco?
  autonomia     Autonomia?
  comportamento Comportamento?
  desempenho    Desempenho?
  anotacao      String?
  fechado       Boolean                @default(false)
  horaInicio    DateTime?
  horaFim       DateTime?
  duracaoMin    Int?
  criadoEm      DateTime               @default(now())
  atualizadoEm  DateTime               @updatedAt
  conteudos     RegistroAulaConteudo[]

  @@unique([horarioId, data])
  @@index([data])
  @@map("registros_aula")
}

model RegistroAulaConteudo {
  registroId String
  conteudoId String
  registro   RegistroAula @relation(fields: [registroId], references: [id])
  conteudo   Conteudo     @relation(fields: [conteudoId], references: [id])

  @@id([registroId, conteudoId])
  @@map("registro_aula_conteudo")
}
```

---

> Você vai implementar a API descrita neste documento inteiro (as seções acima, do "Convenções gerais" até "Erros preveníveis pela UI", mais o "Schema Prisma completo" logo acima) num repositório Node.js que já está inicializado. Leia o documento inteiro antes de escrever qualquer código — ele já contém todos os DTOs, endpoints, regras de negócio e o schema de dados que você vai construir. Onde a spec já tomou uma decisão (ex.: o erro humanizado de matrícula, o snapshot de `estagio`, a leniência do registro de aula), implemente exatamente como está escrito — não é sugestão, é especificação fechada.
>
> **Você não deve me perguntar nada.** Onde encontrar uma ambiguidade genuína que a spec não resolve, tome a decisão mais razoável, implemente, e documente essa decisão de forma destacada no `docs/pr-XX-*.md` daquele PR, numa seção "Pontos para revisão". Eu reviso depois — seu trabalho é entregar a cadeia de PRs pronta, nunca travar esperando resposta.
>
> ### Stack e convenções de código
>
> - Runtime: Node.js, servido via `@hono/node-server`.
> - Framework: Hono. Validação de entrada: Zod, via `@hono/zod-validator` (`zValidator('json', Schema)`).
> - ORM: Prisma, Postgres. Enums nativos do Postgres (já modelados no `schema.prisma` acima) — não reintroduza um mapa manual int↔string, isso já foi resolvido pela escolha de enum nativo.
> - Hash de senha: `bcryptjs` (evita dependência nativa compilada).
> - Token de sessão: `hono/jwt`, segredo em `process.env.JWT_SECRET`, expiração de 7 dias.
> - Token de reset de senha: string aleatória própria (não é JWT — precisa ser revogável/de uso único), guardada **hasheada** em `Usuario.resetTokenHash` (nunca em texto puro, mesmo padrão da senha), expiração de 1 hora.
> - camelCase em todo lugar (nomes de arquivo em kebab-case; exports de função/variável em camelCase; exports de schema Zod e model Prisma em PascalCase).
> - Sem paginação em nenhuma listagem, por enquanto.
>
> ### Estrutura de pastas
>
> ```
> src/
>   app.ts                     # monta o Hono app, middlewares globais, monta as rotas de cada feature
>   server.ts                  # entrypoint, sobe com @hono/node-server
>   db/
>     client.ts                # singleton do PrismaClient
>   middlewares/
>     auth.ts                  # authMiddleware — decodifica o JWT, faz c.set('usuario', ...)
>     scope-to-professor.ts
>     require-admin.ts
>   lib/                       # utilidades compartilhadas do server, sem lógica de negócio de feature
>     senha.ts                 # hash/verificação com bcryptjs
>     token.ts                 # geração/hash de token de reset
>     erros.ts                 # classe de erro customizada + error handler central do Hono
>   features/
>     auth/
>       auth.dto.ts            # os schemas Zod de entrada/saída deste grupo
>       auth.routes.ts
>       auth.service.ts        # lógica de negócio, chama o Prisma
>     professores/
>     materias/
>     alunos/
>     matriculas/
>     horarios/
>     registros/
>     agenda/
>     painel/
>   shared/
>     dto/
>       enums.ts               # os z.enum(...) compartilhados entre features (ChegadaEnum, DiaSemanaEnum etc.)
> prisma/
>   schema.prisma
>   migrations/
> tests/
>   e2e/
>     <feature>.e2e.test.ts    # um arquivo por feature, espelhando src/features/
>   helpers/
>     setup.ts                 # sobe o app de teste + funções de limpeza do banco entre testes
>     factories.ts             # funções pra criar aluno/professor/matrícula de teste rapidamente
> docs/
>   pr-01-prisma-setup.md
>   pr-02-auth.md
>   ...  (um arquivo por PR, mesmo nome da branch)
> docker-compose.yml
> .env.example
> ```
>
> ### Estratégia de testes — E2E, não unitário
>
> - Use `app.request(path, init)`, o método nativo do próprio Hono (https://hono.dev/docs/guides/testing) — ele testa a aplicação de ponta a ponta sem precisar subir um servidor HTTP de verdade, mas passa pelo roteamento e pelos middlewares reais.
> - **Não use `testClient()` de `hono/testing`** — ele só infere tipos corretamente se as rotas forem definidas encadeadas direto em `new Hono().get(...).post(...)`, o que não combina com "uma rota por arquivo de feature". `app.request()` funciona independente de como as rotas foram organizadas.
> - Runner: Vitest.
> - Banco real, nunca mock do Prisma — os testes rodam contra o Postgres do `docker-compose.yml`. Cada arquivo de teste limpa as tabelas relevantes antes de cada `describe` (helper `resetDb()` em `tests/helpers/setup.ts` fazendo `TRUNCATE ... CASCADE`).
> - Cada rota, no mínimo, precisa de teste cobrindo: o caminho feliz, um caso de escopo (`professor` não vê/não edita dado de outro professor), e a regra de negócio específica documentada na seção correspondente da spec (ex.: `PUT /matriculas/:id` com `professorId` no corpo → mensagem de erro específica).
>
> ### Fluxo de branches e PRs
>
> Cadeia linear, cada branch nasce da anterior (não de `main`, exceto a primeira):
>
> 1. `feat/01-prisma-setup` (a partir da branch padrão do repo)
> 2. `feat/02-auth` (a partir de `feat/01-prisma-setup`)
> 3. `feat/03-professores`
> 4. `feat/04-materias-conteudos`
> 5. `feat/05-alunos`
> 6. `feat/06-matriculas`
> 7. `feat/07-horarios`
> 8. `feat/08-registros`
> 9. `feat/09-agenda`
> 10. `feat/10-painel`
>
> Cada PR é aberto contra a branch do PR anterior (stacked PRs) — revisável e "abrível" mesmo antes do anterior ser mergeado.
>
> ### PR 1 — Prisma + infraestrutura local
>
> - Copie o `schema.prisma` da seção acima pra `prisma/schema.prisma`.
> - Crie `docker-compose.yml` subindo Postgres na porta **54321** do host (mapeada pra `5432` do container) — porta escolhida de propósito, fora do padrão `5432`/`5433`, pra não colidir com outros projetos locais.
> - Crie `.env.example` com `DATABASE_URL="postgresql://kflow:kflow@localhost:54321/kflow"` e `JWT_SECRET="troque-em-producao"`.
> - Rode a migration inicial (`prisma migrate dev --name init`).
> - Crie `src/db/client.ts` com o singleton do `PrismaClient`.
> - Crie um endpoint `GET /health` que faz uma query trivial via Prisma (ex.: `SELECT 1`) e responde `{ status: 'ok' }` — é o único endpoint deste PR, e existe justamente pra dar ao teste e2e algo real de ponta a ponta pra validar (Hono → Prisma → Postgres local, todos conectados de fato).
> - Teste e2e: `GET /health` responde `200` e `{ status: 'ok' }` com o banco no ar.
>
> ### PR 2 a 10 — cada grupo de endpoints
>
> Implemente a seção correspondente da spec (DTOs, endpoints, middlewares, regras de negócio) exatamente como documentado. Referência PR → seção da spec:
>
> | PR                      | Seção da spec              | Depende de |
> | ----------------------- | -------------------------- | ---------- |
> | 02 — auth               | 1. Autenticação e usuários | PR 01      |
> | 03 — professores        | 2. Professores             | PR 02      |
> | 04 — materias-conteudos | 3. Matérias e conteúdos    | PR 03      |
> | 05 — alunos             | 4. Alunos                  | PR 04      |
> | 06 — matriculas         | 5. Matrículas              | PR 05      |
> | 07 — horarios           | 6. Horários semanais       | PR 06      |
> | 08 — registros          | 7. Registro de aula        | PR 07      |
> | 09 — agenda             | 8. Agenda                  | PR 08      |
> | 10 — painel             | 9. Painel                  | PR 09      |
>
> ### Checklist de saída — repita para cada PR, sem exceção
>
> - [ ] Branch criada a partir da branch do PR anterior (nunca a partir de `main`, exceto o PR 01).
> - [ ] Código na estrutura de pastas descrita acima.
> - [ ] Testes e2e cobrindo caminho feliz + escopo + a(s) regra(s) de negócio da seção.
> - [ ] `docs/pr-XX-<nome>.md` criado, com três seções: **"O que foi implementado"**, **"Decisões tomadas"** (toda vez que você resolveu uma ambiguidade sozinho, listar aqui o que decidiu e por quê), e **"Pontos para revisão"** (o que eu deveria olhar com atenção antes de mergear — inclui qualquer trade-off, qualquer coisa que a spec deixou em aberto e você teve que resolver, e qualquer risco que você percebeu ao implementar).
> - [ ] PR aberto contra a branch anterior, título e descrição batendo com o `docs/*.md` daquele PR.
