// Which site this build serves (SPEC §13.8): the main site, or the dev site at /dev/ that the
// develop branch deploys to. CI sets VITE_CHANNEL=dev and VITE_BUILD=<short sha> for the dev build.
// Both sites share an origin, so the dev site keeps its own storage keys: a dev run never resumes
// or overwrites a main-site save.

export const DEV_SITE = import.meta.env.VITE_CHANNEL === 'dev';
export const BUILD: string = import.meta.env.VITE_BUILD ?? '';

/** A localStorage key for this site. */
export const storageKey = (key: string): string => (DEV_SITE ? `dev/${key}` : key);
