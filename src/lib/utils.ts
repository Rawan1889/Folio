import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    available: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    occupied: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    cleaning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    maintenance: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    blocked: 'bg-red-500/10 border-red-500/30 text-red-400',
    confirmed: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    checked_in: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    checked_out: 'bg-gray-500/10 border-gray-500/30 text-gray-400',
    cancelled: 'bg-red-500/10 border-red-500/30 text-red-400',
    no_show: 'bg-red-500/10 border-red-500/30 text-red-400',
  }
  return map[status] ?? 'bg-gray-500/10 border-gray-500/30 text-gray-400'
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}
