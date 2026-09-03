/**
 * Ponte entre os enums nativos do Postgres (sempre MAIUSCULO, ver
 * `prisma/schema.prisma`) e os `z.enum(...)` da API (sempre minusculo, ver
 * `src/shared/dto/enums.ts`). Todo enum do schema segue esse mesmo padrao de
 * caixa, entao uma unica conversao textual resolve todos eles — nao ha mapa
 * campo a campo para manter.
 */

export function paraApi<TApi extends string>(valorBanco: string): TApi {
  return valorBanco.toLowerCase() as TApi
}

export function paraBanco<TBanco extends string>(valorApi: string): TBanco {
  return valorApi.toUpperCase() as TBanco
}
