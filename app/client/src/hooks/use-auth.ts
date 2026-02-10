import { useContext } from 'react'
import { AuthContext } from '../contexts/index.ts'

export const useAuth = () => useContext(AuthContext)
