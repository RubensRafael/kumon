import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { ApiError } from '@client/config/api'
import { ResetarSenhaInput } from '@shared/dto'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form'
import { Input } from '../../components/ui/input'
import { useApiMutation } from '../../hooks/use-api-mutation'
import { AuthLayout } from './components/auth-layout'

const NovaSenhaInput = ResetarSenhaInput.pick({ novaSenha: true })
type NovaSenhaInputType = { novaSenha: string }

export function ResetarSenhaPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const { mutate, loading } = useApiMutation('resetarSenha')
  const [erro, setErro] = useState<string | null>(null)
  const [concluido, setConcluido] = useState(false)

  const form = useForm<NovaSenhaInputType>({
    resolver: zodResolver(NovaSenhaInput),
    defaultValues: { novaSenha: '' },
  })

  async function onSubmit(dados: NovaSenhaInputType) {
    setErro(null)
    try {
      await mutate({ body: { token, novaSenha: dados.novaSenha } })
      setConcluido(true)
      toast.success('Senha redefinida com sucesso.')
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : 'Nao foi possivel redefinir a senha.')
    }
  }

  if (!token) {
    return (
      <AuthLayout>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Link inválido</CardTitle>
            <CardDescription>Esse link de redefinição está incompleto ou expirou.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link to="/esqueci-senha" className="text-sm font-medium text-primary hover:underline">
              Solicitar um novo link
            </Link>
          </CardFooter>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>Escolha uma nova senha com pelo menos 8 caracteres.</CardDescription>
        </CardHeader>
        {concluido ? (
          <CardContent>
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">
              Ir para o login
            </Link>
          </CardContent>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="novaSenha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova senha</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Salvando...' : 'Redefinir senha'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        )}
      </Card>
    </AuthLayout>
  )
}
