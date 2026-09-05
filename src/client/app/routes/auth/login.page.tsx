import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'

import { ApiError } from '@client/config/api'
import { LoginInput, type LoginInputType } from '@shared/dto'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form'
import { Input } from '../../components/ui/input'
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
        <CardHeader>
          <CardTitle>Entrar no KFlow</CardTitle>
          <CardDescription>Use o email e a senha da sua conta.</CardDescription>
        </CardHeader>
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
                      <Input type="email" autoComplete="email" {...field} />
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
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
              <Link to="/esqueci-senha" className="text-sm text-muted-foreground hover:text-foreground">
                Esqueci minha senha
              </Link>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </AuthLayout>
  )
}
