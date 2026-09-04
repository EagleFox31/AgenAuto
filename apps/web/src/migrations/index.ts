import * as migration_20260903_134411_initial_foundation from './20260903_134411_initial_foundation';
import * as migration_20260904_123805_canonical_automotive_schema from './20260904_123805_canonical_automotive_schema';

export const migrations = [
  {
    up: migration_20260903_134411_initial_foundation.up,
    down: migration_20260903_134411_initial_foundation.down,
    name: '20260903_134411_initial_foundation',
  },
  {
    up: migration_20260904_123805_canonical_automotive_schema.up,
    down: migration_20260904_123805_canonical_automotive_schema.down,
    name: '20260904_123805_canonical_automotive_schema'
  },
];
