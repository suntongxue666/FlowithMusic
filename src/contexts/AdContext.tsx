'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface AdContextType {
  isAdForceHidden: boolean
  setAdForceHidden: (hidden: boolean) => void
}

const AdContext = createContext<AdContextType | undefined>(undefined)

export const AdProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdForceHidden, setAdForceHidden] = useState(false)

  return (
    <AdContext.Provider value={{ isAdForceHidden, setAdForceHidden }}>
      {children}
    </AdContext.Provider>
  )
}

export const useAdContext = () => {
  const context = useContext(AdContext)
  if (context === undefined) {
    throw new Error('useAdContext must be used within an AdProvider')
  }
  return context
}
