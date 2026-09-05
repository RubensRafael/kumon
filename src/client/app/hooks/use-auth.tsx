import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

import type { UsuarioOutputType } from '../../../shared/dto'
import { callApi } from '../../config/api'

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

  useEffect(() => {
    let ativo = true

    void (async () => {
      try {
        const data = await callApi('me', {})
        if (ativo) setUsuario(data)
      } catch {
        if (ativo) setUsuario(null)
      } finally {
        if (ativo) setCarregando(false)
      }
    })()

    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    const aoDeslogar = () => setUsuario(null)
    window.addEventListener('kflow:unauthorized', aoDeslogar)
    return () => window.removeEventListener('kflow:unauthorized', aoDeslogar)
  }, [])

  const login = useCallback(async (email: string, senha: string) => {
    const { usuario: usuarioLogado } = await callApi('login', { body: { email, senha } })
    setUsuario(usuarioLogado)
  }, [])

  const logout = useCallback(async () => {
    await callApi('logout', {})
    setUsuario(null)
  }, [])

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
