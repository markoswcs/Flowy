import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Flowy',
    short_name: 'Flowy',
    description: 'Tarefas, notas e projetos em um só lugar.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#0d041e',
    theme_color: '#0d041e',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
