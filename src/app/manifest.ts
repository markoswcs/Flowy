import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    // A fixed identity: Chrome keys installs (and "still adding" checks) by it.
    // "/app" equals the id older installs got from start_url, so they stay the same app.
    id: '/app',
    name: 'Flowy',
    short_name: 'Flowy',
    description: 'Tarefas, notas e projetos em um só lugar.',
    lang: 'pt-BR',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    background_color: '#0d041e',
    theme_color: '#0d041e',
    prefer_related_applications: false,
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      // Full-bleed versions for Android's adaptive icons (circle, squircle…):
      // without them Android shrinks the transparent logo onto a white disc.
      {
        src: '/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
