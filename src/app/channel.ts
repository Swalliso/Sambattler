// Which build this is (SPEC §13.8): the game (main, `npm run build`) or the dev site (develop,
// `npm run build:dev`, served from /Sambattler/dev/). Both sites are on the swalliso.github.io
// origin, so they share localStorage: every storage key goes through storageKey() so a dev build
// can never resume or overwrite a saved run on the game.

export const DEV_SITE = import.meta.env.MODE === 'develop';

/** Short commit hash for CI builds (CI sets VITE_COMMIT), or '' for local builds. */
export const BUILD_SHA = String(import.meta.env.VITE_COMMIT ?? '').slice(0, 7);

/** A localStorage key for this build. The game's keys must never change, or players lose their saves. */
export const storageKey = (key: string): string => (DEV_SITE ? `dev/${key}` : key);
