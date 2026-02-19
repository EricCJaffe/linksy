interface RichTextDisplayProps {
  content: string | null | undefined
  className?: string
}

const HTML_TAG_RE = /<[a-z][\s\S]*?>/i

export function RichTextDisplay({ content, className }: RichTextDisplayProps) {
  if (!content) return null

  const isHtml = HTML_TAG_RE.test(content)

  if (isHtml) {
    return (
      <div
        className={`prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 ${className ?? ''}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  return <p className={`whitespace-pre-wrap ${className ?? ''}`}>{content}</p>
}
