// Sub pages: the hero photograph is framed by a living ring of fire.
import { finishLoading } from './main.js';
import { state } from './scene/state.js';

finishLoading();
import('./scene/world.js').then(({ createWorld }) =>
  createWorld(document.querySelector('.stage canvas'), {
    mode: 'page',
    state,
    anchor: document.querySelector('.page-hero .media'),
  })
);
