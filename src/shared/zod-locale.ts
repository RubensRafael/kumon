import { z } from 'zod'
import { ptBR } from 'zod/locales'

/**
 * Mensagens de validacao do Zod em pt-BR, para todo o app.
 *
 * `z.config` altera um estado global do modulo `zod` — e por isso que este
 * arquivo so faz sentido como um import por efeito colateral (`import
 * './zod-locale'`, sem nomes), executado o mais cedo possivel no entry point
 * de cada lado (`src/client/main.tsx` e `src/server/app.ts`): front e back
 * empacotam sua propria copia do `zod`, e cada uma precisa configurar a sua
 * antes de qualquer schema de `shared/dto/` validar algo.
 */
z.config(ptBR())
