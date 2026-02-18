import type { HostWidgetConfig } from '@/lib/types/linksy'
import { Send, MapPin } from 'lucide-react'

interface WidgetPreviewProps {
  config: HostWidgetConfig
  providerName: string
}

export function WidgetPreview({ config, providerName }: WidgetPreviewProps) {
  const botName = config.bot_name || 'Linksy'
  const primaryColor = config.primary_color || '#2563eb'
  const secondaryColor = config.secondary_color || primaryColor
  const headerBg = config.header_bg_color || '#ffffff'
  const fontFamily = config.font_family || 'system-ui, sans-serif'
  const welcomeMessage =
    config.welcome_message ||
    `Hello! I'm ${botName}, your community resource assistant. What do you need help with today?`

  // Determine if header bg is dark to pick text color
  const headerTextColor = isDark(headerBg) ? '#ffffff' : '#0f172a'
  const headerSubColor = isDark(headerBg) ? 'rgba(255,255,255,0.7)' : '#64748b'

  return (
    <div
      className="w-full max-w-[360px] rounded-lg border shadow-sm overflow-hidden bg-background"
      style={{ fontFamily, height: 320 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 border-b"
        style={{ backgroundColor: headerBg, borderColor: primaryColor + '33' }}
      >
        {config.logo_url ? (
          <img
            src={config.logo_url}
            alt=""
            className="h-7 w-7 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="h-7 w-7 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: primaryColor + '20', color: primaryColor }}
          >
            {botName.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: headerTextColor }}>
            {botName}
          </p>
          <p className="text-[10px] truncate" style={{ color: headerSubColor }}>
            Powered by {providerName}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="px-3 py-2.5 space-y-2 overflow-hidden" style={{ height: 216 }}>
        {/* Assistant welcome */}
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-xl rounded-bl-sm bg-muted px-3 py-1.5">
            <p className="text-[11px] leading-relaxed text-foreground line-clamp-3">
              {welcomeMessage}
            </p>
          </div>
        </div>

        {/* Sample user bubble */}
        <div className="flex justify-end">
          <div
            className="max-w-[80%] rounded-xl rounded-br-sm px-3 py-1.5 text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <p className="text-[11px] leading-relaxed">
              I need help with food assistance
            </p>
          </div>
        </div>

        {/* Sample assistant response with provider card */}
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-xl rounded-bl-sm bg-muted px-3 py-1.5 space-y-1.5">
            <p className="text-[11px] leading-relaxed text-foreground">
              Here are some resources near you:
            </p>
            <div className="rounded border bg-background p-2 space-y-1">
              <p className="text-[11px] font-semibold">Community Food Pantry</p>
              <div className="flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5 flex-shrink-0" style={{ color: secondaryColor }} />
                <span className="text-[10px] text-muted-foreground">Jacksonville, FL</span>
              </div>
              <span
                className="inline-flex items-center gap-0.5 text-[10px] rounded px-1 py-0.5"
                style={{ backgroundColor: secondaryColor + '20', color: secondaryColor }}
              >
                <MapPin className="h-2.5 w-2.5" /> 2.1 mi
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t px-3 py-2 flex items-center gap-2">
        <div className="flex-1 rounded-md border bg-muted/30 px-2 py-1">
          <p className="text-[10px] text-muted-foreground">Describe what you need help with...</p>
        </div>
        <div
          className="h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          <Send className="h-3 w-3 text-white" />
        </div>
      </div>
    </div>
  )
}

function isDark(hex: string): boolean {
  const c = hex.replace('#', '')
  if (c.length < 6) return false
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}
