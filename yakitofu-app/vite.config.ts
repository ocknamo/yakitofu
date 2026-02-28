import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vite.dev/config/
export default defineConfig({
	plugins: [tailwindcss(), svelte()],
	// GitHub Pages deployment configuration
	// If deploying to https://<USERNAME>.github.io/yakitofu/, set base to '/yakitofu/'
	// If using a custom domain, remove or set base to '/'
	base: process.env.NODE_ENV === 'production' ? '/yakitofu/' : '/',
});
