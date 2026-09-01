<script setup lang="ts">
import { ref } from 'vue'
import type { HTMLAttributes } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const props = defineProps<{
    class?: HTMLAttributes['class']
}>()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleSubmit = async () => {
    error.value = ''
    loading.value = true

    const result = await authStore.login(email.value, password.value)

    loading.value = false

    if (result.success) {
        const redirect = (route.query.redirect as string) || '/'
        router.push(redirect)
    } else {
        error.value = result.error
    }
}
</script>

<template>
    <div :class="cn('flex flex-col gap-6', props.class)">
        <Card>
            <CardHeader class="text-center">
                <CardTitle class="text-xl"> Se connecter </CardTitle>
                <CardDescription>
                    Connectez-vous à votre compte pour continuer.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form @submit.prevent="handleSubmit">
                    <FieldGroup>
                        <Field>
                            <FieldLabel for="email"> Email </FieldLabel>
                            <Input
                                id="email"
                                v-model="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                            />
                        </Field>
                        <Field>
                            <div class="flex items-center">
                                <FieldLabel for="password">
                                    Mot de passe
                                </FieldLabel>
                            </div>
                            <Input
                                id="password"
                                v-model="password"
                                type="password"
                                required
                            />
                        </Field>
                        <p v-if="error" class="text-sm text-destructive">
                            {{ error }}
                        </p>
                        <Field>
                            <Button type="submit" :disabled="loading">
                                {{ loading ? 'Connexion...' : 'Se connecter' }}
                            </Button>
                        </Field>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    </div>
</template>
