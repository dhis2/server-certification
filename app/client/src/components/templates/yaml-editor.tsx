import { useCallback, useRef, useEffect, useState } from 'react'
import type { FC, ChangeEvent, UIEvent } from 'react'
import type { ValidationError } from '../../types/template.ts'
import styles from './yaml-editor.module.css'

export interface YamlEditorProps {
    value: string
    onChange?: (value: string) => void
    readOnly?: boolean
    errors?: ValidationError[]
    maxHeight?: string
    placeholder?: string
    'aria-label'?: string
}

export const YamlEditor: FC<YamlEditorProps> = ({
    value,
    onChange,
    readOnly = false,
    errors = [],
    maxHeight = '500px',
    placeholder = 'Paste or type YAML/JSON content here...',
    'aria-label': ariaLabel = 'Template content editor',
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const lineNumbersRef = useRef<HTMLDivElement>(null)
    const [lineCount, setLineCount] = useState(1)

    useEffect(() => {
        const lines = value.split('\n').length
        setLineCount(Math.max(lines, 1))
    }, [value])

    const handleScroll = useCallback((event: UIEvent<HTMLTextAreaElement>) => {
        if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop
        }
    }, [])

    const handleChange = useCallback(
        (event: ChangeEvent<HTMLTextAreaElement>) => {
            if (onChange) {
                onChange(event.target.value)
            }
        },
        [onChange]
    )

    const errorLines = new Set(
        errors
            .map((error) => {
                // Match paths like "/0", "[0]", or extract last numeric segment from "/categories/0/criteria/1"
                const match = error.path.match(/(?:^|\/)(\d+)(?:\/|$)/) || error.path.match(/^\[?(\d+)\]?$/)
                return match ? parseInt(match[1], 10) + 1 : null
            })
            .filter((line): line is number => line !== null)
    )

    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)

    return (
        <div className={styles.container} style={{ maxHeight }}>
            <div className={styles.lineNumbers} ref={lineNumbersRef} aria-hidden="true">
                {lineNumbers.map((num) => (
                    <span key={num} className={`${styles.lineNumber} ${errorLines.has(num) ? styles.errorLine : ''}`}>
                        {String(num)}
                    </span>
                ))}
            </div>
            <textarea
                ref={textareaRef}
                className={styles.editor}
                value={value}
                onChange={handleChange}
                onScroll={handleScroll}
                readOnly={readOnly}
                placeholder={placeholder}
                spellCheck={false}
                aria-label={ariaLabel}
                aria-readonly={readOnly}
                data-test="yaml-editor"
            />
        </div>
    )
}
