import { BookOpen, LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'

import { navItems } from '@client/config/routes'

import { Avatar, AvatarFallback } from '../ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '../ui/sidebar'
import { useAuth } from '../../hooks/use-auth'

function iniciaisDe(nome: string) {
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '')).toUpperCase()
}

/**
 * Shell autenticado: sidebar fixa à esquerda (paleta própria, ver
 * `globals.css`) + barra superior com data + avatar/menu do usuário.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, isAdmin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  async function aoSair() {
    await logout()
    navigate('/login', { replace: true })
  }

  const itensVisiveis = navItems.filter((item) => !item.adminOnly || isAdmin)

  // `Intl.DateTimeFormat('pt-BR', ...)` devolve tudo minusculo ("sábado, 05 de
  // setembro") -- em português só a primeira letra da frase leva maiúscula
  // ("Sábado, 05 de setembro"), nunca cada palavra (o que um `capitalize` do
  // CSS aplicaria, maiusculizando também o "De").
  const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date())
  const hoje = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1)

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-primary">
              <BookOpen className="size-4" />
            </span>
            <div className="flex flex-col text-sidebar-foreground">
              <span className="text-sm leading-tight font-semibold">KFlow</span>
              <span className="text-xs leading-tight opacity-70">Gestão Inteligente Kumon</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {itensVisiveis.map((item) => {
                const ativo = location.pathname === item.path
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.path}>
                    {ativo ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-1 left-0 w-1 rounded-r bg-orange-600"
                      />
                    ) : null}
                    <SidebarMenuButton asChild isActive={ativo}>
                      <NavLink to={item.path}>
                        {Icon ? <Icon className="size-4" /> : null}
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg">
                <Avatar className="size-6">
                  <AvatarFallback className="bg-white text-primary">
                    {usuario ? iniciaisDe(usuario.nome) : ''}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{usuario?.nome}</span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuItem onSelect={() => void aoSair()}>
                <LogOut className="size-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      {/* `asChild`: o `<main>` que o SidebarInset renderiza por padrao viraria um
          segundo landmark <main> na pagina, junto com o da linha de baixo --
          so um por documento e permitido. Com `asChild` o SidebarInset empresta
          seu estilo pro `<div>` abaixo, e o unico `<main>` fica com o conteudo. */}
      <SidebarInset asChild>
        <div>
          <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <span className="text-sm text-muted-foreground">{hoje}</span>
            </div>
            <div className="flex items-center gap-4">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {usuario ? iniciaisDe(usuario.nome) : ''}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
