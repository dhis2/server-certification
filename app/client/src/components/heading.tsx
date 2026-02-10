import { FC, ReactNode } from 'react'
import styles from './heading.module.css'

export const Heading: FC<{ title: string; children?: ReactNode }> = ({ title, children }) => (
    <div className={styles.heading}>
        <h1>{title}</h1>
        {children}
    </div>
)
