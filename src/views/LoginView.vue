<script setup lang="ts">
import AppLogoIcon from '@/components/AppLogoIcon.vue'
import LoginForm from '@/components/LoginForm.vue'
</script>
<template>
    <div
        class="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10"
    >
        <div class="flex w-full max-w-sm flex-col gap-6">
            <a class="flex flex-col items-center gap-2 font-medium" href="#">
                <div
                    class="mb-1 flex h-9 w-9 items-center justify-center rounded-md"
                >
                    <AppLogoIcon />
                </div>
                <span class="sr-only">Connectez-vous à votre compte</span>
            </a>
            <LoginForm />
        </div>
    </div>
</template>
