import type { ConnectionFields } from './SavedRestoreTarget';

export interface UpdateSavedRestoreTargetRequest {
  name: string;
  connection: ConnectionFields;
}
