import * as migration_20260903_134411_initial_foundation from './20260903_134411_initial_foundation';
import * as migration_20260904_123805_canonical_automotive_schema from './20260904_123805_canonical_automotive_schema';
import * as migration_20260904_131332_payload_auth_rbac_audit from './20260904_131332_payload_auth_rbac_audit';
import * as migration_20260904_135422_catalog_data_quality from './20260904_135422_catalog_data_quality';

export const migrations = [
  {
    up: migration_20260903_134411_initial_foundation.up,
    down: migration_20260903_134411_initial_foundation.down,
    name: '20260903_134411_initial_foundation',
  },
  {
    up: migration_20260904_123805_canonical_automotive_schema.up,
    down: migration_20260904_123805_canonical_automotive_schema.down,
    name: '20260904_123805_canonical_automotive_schema',
  },
  {
    up: migration_20260904_131332_payload_auth_rbac_audit.up,
    down: migration_20260904_131332_payload_auth_rbac_audit.down,
    name: '20260904_131332_payload_auth_rbac_audit',
  },
  {
    up: migration_20260904_135422_catalog_data_quality.up,
    down: migration_20260904_135422_catalog_data_quality.down,
    name: '20260904_135422_catalog_data_quality'
  },
];
