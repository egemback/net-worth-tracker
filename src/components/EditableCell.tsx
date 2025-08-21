"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  id: number
  field: string
  value: string | number | null
  action: (formData: FormData) => Promise<void>
  type?: 'text' | 'number'
  step?: string
  placeholder?: string
  displayValue?: string | null
}

export default function EditableCell({ id, field, value, action, type = 'text', step = '0.01', placeholder, displayValue }: Props) {
  const [editing, setEditing] = useState(false)
const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function commit(val: string) {
    const fd = new FormData()
    fd.set('id', String(id))
    fd.set('field', field)
    fd.set('value', val)
    await action(fd)
    try { window.dispatchEvent(new CustomEvent('toast', { detail: 'Saved' })); } catch {}
    router.refresh()
    setEditing(false)
  }

  return (
    <>
      {editing ? (
        <input
          ref={inputRef}
          defaultValue={value == null ? '' : String(value)}
          type={type}
          step={type === 'number' ? step : undefined}
          placeholder={placeholder}
          onBlur={(e) => commit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit((e.target as HTMLInputElement).value) }
            if (e.key === 'Escape') setEditing(false)
          }}
          className="rounded border border-gray-300 p-1 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <span className="cursor-text" onClick={() => setEditing(true)}>
          {value == null || value === '' ? <span className="text-gray-400">—</span> : (displayValue ?? String(value))}
        </span>
      )}
    </>
  )
}

