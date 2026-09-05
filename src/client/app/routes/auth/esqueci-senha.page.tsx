import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'

import { SolicitarResetInput, type SolicitarResetInputType } from '@shared/dto'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form'
import { Input } from '../../components/ui/input'
import { useApiMutation } from '../../hooks/use-api'
import { AuthLayout } from './components/auth-layout'

export function EsqueciSenhaPage() {
  const { mutate, loading } = useApiMutation('solicitarReset')
  const [enviado, setEnviado] = useState(false)

  const form = useForm<SolicitarResetInputType>({
    resolver: zodResolver(SolicitarResetInput),
    defaultValues: { email: '' },
  })

  async function onSubmit(dados: SolicitarResetInputType) {
    // Sempre "enviado", exista ou não o email — o backend nunca revela isso
    // (`POST /auth/solicitar-reset` sempre responde 204), então a UI não
    // pode diferenciar os dois casos por aqui.
    await mutate({ body: dados }).catch(() => {})
    setEnviado(true)
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Esqueci minha senha</CardTitle>
          <CardDescription>Enviamos um link de redefinição para o seu email.</CardDescription>
        </CardHeader>
        {enviado ? (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se esse email tiver uma conta, um link de redefinição foi enviado. Verifique sua
              caixa de entrada.
            </p>
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">
              Voltar para o login
            </Link>
          </CardContent>
        ) : (
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
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar link'}
                </Button>
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                  Voltar para o login
                </Link>
              </CardFooter>
            </form>
          </Form>
        )}
      </Card>
    </AuthLayout>
  )
}
