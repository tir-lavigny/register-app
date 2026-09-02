import { useAuthStore } from '@/stores/auth'

export const Permissions = {
    VIEW_REGISTER: 'view register',
    OPEN_DAY: 'open day',
    CLOSE_DAY: 'close day',
    REOPEN_DAY: 'reopen day',
    ADD_CASH_REMARK: 'add cash remark',
    CREATE_TICKET: 'create ticket',
    VIEW_TICKETS: 'view tickets',
    REFUND_TICKET: 'refund ticket',
} as const

export type Permission = (typeof Permissions)[keyof typeof Permissions]

export function hasPermission(permission: Permission): boolean {
    const authStore = useAuthStore()
    return authStore.hasPermission(permission)
}
