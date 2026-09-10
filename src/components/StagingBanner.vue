<script setup lang="ts">
const env = import.meta.env.VITE_APP_ENV;
</script>

<template>
    <Teleport to="body">
        <div
            v-if="env !== 'production'"
            class="pointer-events-none fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 py-0.5 text-center text-[10px] font-bold text-black"
        >
            {{ env === 'staging' ? 'STAGING' : 'DEV' }}
        </div>
    </Teleport>
</template>
