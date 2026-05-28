import type { ConnectionFields } from './SavedRestoreTarget';
import type { DatabaseType } from '../../databases';

export interface CreateSavedRestoreTargetRequest {
  name: string;
  databaseType: DatabaseType;
  connection: ConnectionFields;
}
