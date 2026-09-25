import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const page = (name) => resolve(import.meta.dirname, name);

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: page('index.html'),
        children: page('children-home.html'),
        school: page('school.html'),
        elders: page('elder-care.html'),
        thiruppani: page('thiruppani.html'),
        award: page('award-ceremony.html'),
        notFound: page('404.html'),
      },
    },
  },
});
