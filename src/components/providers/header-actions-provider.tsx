"use client"

/**
 * Header Actions Context
 * Permite a las páginas registrar acciones contextuales en el header global
 * 
 * Ejemplo de uso en una página:
 * ```tsx
 * "use client"
 * import { useHeaderActions } from "@/src/components/providers/header-actions-provider"
 * 
 * function LeadDetailPageActions({ lead }) {
 *   useHeaderActions({
 *     backButton: { href: "/crm/leads", label: "Volver a Leads" },
 *     actions: [
 *       { id: "chat", icon: MessageSquare, label: "Ver Chat", href: `/chat?chatId=${lead.chatId}` },
 *       { id: "edit", icon: Edit, component: <EditLeadButton lead={lead} /> },
 *     ],
 *   })
 *   return null
 * }
 * ```
 */

import { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useEffect,
  type ReactNode,
  type ComponentType,
} from "react"
import type { LucideIcon } from "lucide-react"

export interface HeaderAction {
  id: string
  icon?: LucideIcon
  label?: string
  /**
   * Si se proporciona href, se renderiza como Link
   */
  href?: string
  /**
   * Si se proporciona component, se renderiza directamente (para casos complejos como modales)
   */
  component?: ReactNode
  /**
   * Si se proporciona onClick, se renderiza como Button
   */
  onClick?: () => void
  /**
   * Variante del botón
   */
  variant?: "default" | "outline" | "ghost" | "secondary"
}

export interface HeaderBackButton {
  href: string
  label?: string
}

export interface HeaderActionsConfig {
  /**
   * Botón de volver (aparece a la izquierda)
   */
  backButton?: HeaderBackButton
  /**
   * Título personalizado para la página (opcional, sobreescribe el automático)
   */
  title?: string
  /**
   * Acciones de la página (aparecen a la derecha, antes de las acciones globales)
   */
  actions?: HeaderAction[]
}

interface HeaderActionsContextType {
  config: HeaderActionsConfig | null
  setConfig: (config: HeaderActionsConfig | null) => void
}

const HeaderActionsContext = createContext<HeaderActionsContextType | null>(null)

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HeaderActionsConfig | null>(null)

  return (
    <HeaderActionsContext.Provider value={{ config, setConfig }}>
      {children}
    </HeaderActionsContext.Provider>
  )
}

/**
 * Hook para que las páginas registren sus acciones en el header
 * Las acciones se limpian automáticamente cuando el componente se desmonta
 */
export function useHeaderActions(config: HeaderActionsConfig) {
  const context = useContext(HeaderActionsContext)
  
  if (!context) {
    throw new Error("useHeaderActions must be used within HeaderActionsProvider")
  }

  const { setConfig } = context

  useEffect(() => {
    setConfig(config)
    
    // Limpiar cuando el componente se desmonta
    return () => {
      setConfig(null)
    }
  }, [config, setConfig])
}

/**
 * Hook para acceder a la configuración del header (usado internamente por DashboardHeader)
 */
export function useHeaderActionsConfig() {
  const context = useContext(HeaderActionsContext)
  
  if (!context) {
    throw new Error("useHeaderActionsConfig must be used within HeaderActionsProvider")
  }

  return context.config
}
