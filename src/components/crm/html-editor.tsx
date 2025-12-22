"use client"

import { Badge } from "@/src/components/ui/badge"
import { Label } from "@/src/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"

type HtmlEditorProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  description?: string
  placeholder?: string
  tokens?: string[]
  minHeight?: string
}

export function HtmlEditor({
  id,
  label,
  value,
  onChange,
  description,
  placeholder,
  tokens,
  minHeight = "180px",
}: HtmlEditorProps) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Tabs defaultValue="editor" className="w-full">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Vista previa</TabsTrigger>
        </TabsList>
        <TabsContent value="editor">
          <textarea
            id={id}
            className="min-h-[180px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            style={{ minHeight }}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          {tokens?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {tokens.map((token) => (
                <Badge key={token} variant="outline">
                  {token}
                </Badge>
              ))}
            </div>
          ) : null}
        </TabsContent>
        <TabsContent value="preview">
          <div className="rounded-lg border bg-muted/20 p-4">
            <div
              className="text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: value || "<em>Sin contenido</em>" }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
