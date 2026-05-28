import type { DatabaseType } from '../../databases';

export interface ConnectionFields {
  host: string;
  port: number;
  username: string;
  password: string;
  database?: string;
  sslMode?: string;
  sslClientCert?: string;
  sslClientKey?: string;
  sslRootCert?: string;
  isHttps?: boolean;
  isSrv?: boolean;
  isDirectConnection?: boolean;
  isExcludeEvents?: boolean;
  isExcludeExtensions?: boolean;
  isRestoreOwnership?: boolean;
  isRestorePrivileges?: boolean;
  authDatabase?: string;
  excludeTables?: string[];
  excludeCollections?: string[];
}

export interface SavedRestoreTarget {
  id: string;
  name: string;
  databaseType: DatabaseType;
  connection: ConnectionFields;
  createdAt: string;
  updatedAt: string;
}
