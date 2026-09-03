// Punto unico di accesso ai dati. L'interfaccia non sa quale adapter sta usando.

import { localAdapter } from './local/adapter.js'
import { httpAdapter } from './http/adapter.js'

export const DATA_MODE = import.meta.env.VITE_DATA_MODE === 'cloud' ? 'cloud' : 'demo'

export const api = DATA_MODE === 'cloud' ? httpAdapter : localAdapter
