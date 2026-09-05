import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

import type { UsuarioOutputType } from '../../../shared/dto'
import { useApiLazyQuery, useApiMutation } from './use-api'

interface AuthContextValue {
  usuario: UsuarioOutputType | null
  /** `true` só durante a checagem inicial (`GET /me` no boot) — nunca mais depois disso. */
  carregando: boolean
  /** Atalho para `usuario?.papel === 'ADMIN'` — para telas esconderem/desabilitarem ações admin-only. */
  isAdmin: boolean
  /**
   * `true` quando o usuário atual pode editar o cadastro do professor com
   * este id: um admin (qualquer um) ou o próprio professor (só o seu).
   * Existe para nenhuma tela precisar checar `usuario?.papel`/`professorId`
   * na unha — o backend (`requireAdmin`/`restrictProfessorSelf`) já aplica a
   * mesma regra do lado da API.
   */
  podeEditarProfessor: (professorId: string) => boolean
  login: (email: string, senha: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Fonte única do usuário autenticado. Sessão é cookie `httpOnly` (ver
 * `auth.middleware.ts` do server) — nunca há token em JS aqui, só o
 * resultado de `GET /me`/`POST /auth/login` guardado em estado.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioOutputType | null>(null)
  const [carregando, setCarregando] = useState(true)

  const { execute: verificarSessao } = useApiLazyQuery('me')
  // Silenciosas: `login` já mostra erro inline na própria tela (ver
  // `login.page.tsx`), e uma falha ao deslogar ainda limpa `usuario` local --
  // nenhuma das duas precisa do toast automático que `useApiMutation` dispara
  // por padrão.
  const { mutate: autenticar } = useApiMutation('login', { silent: true })
  const { mutate: encerrarSessao } = useApiMutation('logout', { silent: true })

  useEffect(() => {
    let ativo = true

    verificarSessao({})
      .then((data) => {
        if (ativo) setUsuario(data)
      })
      .catch(() => {
        if (ativo) setUsuario(null)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- so deve rodar uma vez, no boot
  }, [])

  useEffect(() => {
    const aoDeslogar = () => setUsuario(null)
    window.addEventListener('kflow:unauthorized', aoDeslogar)
    return () => window.removeEventListener('kflow:unauthorized', aoDeslogar)
  }, [])

  const login = useCallback(
    async (email: string, senha: string) => {
      const { usuario: usuarioLogado } = await autenticar({ body: { email, senha } })
      setUsuario(usuarioLogado)
    },
    [autenticar],
  )

  const logout = useCallback(async () => {
    await encerrarSessao({})
    setUsuario(null)
  }, [encerrarSessao])

  const isAdmin = usuario?.papel === 'ADMIN'

  const podeEditarProfessor = useCallback(
    (professorId: string) => isAdmin || usuario?.professorId === professorId,
    [isAdmin, usuario],
  )

  return (
    <AuthContext.Provider value={{ usuario, carregando, isAdmin, podeEditarProfessor, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return ctx
}
