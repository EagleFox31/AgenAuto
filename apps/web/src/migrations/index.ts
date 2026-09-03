import * as migration_20260903_134411_initial_foundation from './20260903_134411_initial_foundation';

export const migrations = [
  {
    up: migration_20260903_134411_initial_foundation.up,
    down: migration_20260903_134411_initial_foundation.down,
    name: '20260903_134411_initial_foundation'
  },
];
