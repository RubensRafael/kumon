import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'

import { LoginInput, type LoginInputType } from '@shared/dto'

import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form'
import { Input } from '../../components/ui/input'
import { ApiError } from '../../hooks/use-api'
import { useAuth } from '../../hooks/use-auth'
import { AuthLayout } from './components/auth-layout'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [erro, setErro] = useState<string | null>(null)

  const form = useForm<LoginInputType>({
    resolver: zodResolver(LoginInput),
    defaultValues: { email: '', senha: '' },
  })

  async function onSubmit(dados: LoginInputType) {
    setErro(null)
    try {
      await login(dados.email, dados.senha)
      const destino = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'
      navigate(destino, { replace: true })
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : 'Nao foi possivel entrar.')
    }
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="voce@exemplo.com"
                          className="pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="senha"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Senha</FormLabel>
                      <Link to="/esqueci-senha" className="text-sm text-primary hover:underline">
                        Esqueci minha senha
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="password" autoComplete="current-password" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </CardContent>
          </form>
        </Form>
      </Card>
    </AuthLayout>
  )
}
