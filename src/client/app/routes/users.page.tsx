import { type FormEvent, useState } from 'react'

import type { ApiError } from '../../config/api'
import { Card } from '../components/ui/card'
import { useUsers } from '../hooks/use-users'

/**
 * Demonstra o caminho completo de escrita: formulario -> POST /api/users ->
 * validacao zod no Hono -> Prisma -> Neon, com os erros de validacao voltando
 * campo a campo.
 */
export function UsersPage() {
  const { users, loading, error, createUser } = useUsers()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    const result = await createUser({ email, name: name || null })
    setFailure(result)

    if (!result) {
      setEmail('')
      setName('')
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Usuarios</h1>
        <p className="mt-2 text-slate-600">
          A entrada e validada com zod no Hono antes de chegar ao banco.
        </p>
      </div>

      <Card title="Novo usuario">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field
            label="E-mail"
            value={email}
            onChange={setEmail}
            placeholder="pessoa@exemplo.com"
            issue={failure?.issueFor('email')}
          />
          <Field
            label="Nome"
            value={name}
            onChange={setName}
            placeholder="opcional"
            issue={failure?.issueFor('name')}
          />

          {failure && failure.issues.length === 0 ? (
            <p className="text-sm text-rose-600">{failure.message}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Salvando...' : 'Criar usuario'}
          </button>
        </form>
      </Card>

      <Card title={`Cadastrados (${users.length})`}>
        {loading ? <p className="text-sm text-slate-500">Carregando...</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {!loading && !error && users.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum usuario ainda.</p>
        ) : null}

        <ul className="divide-y divide-slate-100">
          {users.map((user) => (
            <li key={user.id} className="flex items-baseline justify-between gap-4 py-2">
              <span className="text-sm font-medium text-slate-900">{user.name ?? '—'}</span>
              <span className="text-sm text-slate-500">{user.email}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  issue,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  issue?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(issue)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 aria-invalid:border-rose-400"
      />
      {issue ? <span className="mt-1 block text-xs text-rose-600">{issue}</span> : null}
    </label>
  )
}
