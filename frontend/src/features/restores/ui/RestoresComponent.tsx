import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { App, Button, Input, Modal, Select, Spin, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';

import type { Backup } from '../../../entity/backups';
import { type Database, DatabaseType, PostgresSslMode } from '../../../entity/databases';
import { type Restore, RestoreStatus, restoreApi } from '../../../entity/restores';
import {
  savedRestoreTargetApi,
  type SavedRestoreTarget,
  type ConnectionFields,
} from '../../../entity/saved-restore-targets';
import { ClipboardHelper } from '../../../shared/lib/ClipboardHelper';
import { getUserTimeFormat } from '../../../shared/time';
import { ConfirmationComponent } from '../../../shared/ui';
import { EditDatabaseSpecificDataComponent } from '../../databases/ui/edit/EditDatabaseSpecificDataComponent';

interface Props {
  database: Database;
  backup: Backup;
}

type DatabaseCredentials = {
  username?: string;
  host?: string;
  port?: number;
  password?: string;
};

const clearCredentials = <T extends DatabaseCredentials>(db: T | undefined): T | undefined => {
  if (!db) return undefined;
  return {
    ...db,
    username: undefined,
    host: undefined,
    port: undefined,
    password: undefined,
  } as T;
};

const createInitialEditingDatabase = (database: Database): Database => ({
  ...database,
  postgresql: clearCredentials(database.postgresql),
  mysql: clearCredentials(database.mysql),
  mariadb: clearCredentials(database.mariadb),
  mongodb: clearCredentials(database.mongodb),
});

const getRestorePayload = (database: Database, editingDatabase: Database) => {
  switch (database.type) {
    case DatabaseType.POSTGRES:
      return { postgresql: editingDatabase.postgresql };
    case DatabaseType.MYSQL:
      return { mysql: editingDatabase.mysql };
    case DatabaseType.MARIADB:
      return { mariadb: editingDatabase.mariadb };
    case DatabaseType.MONGODB:
      return { mongodb: editingDatabase.mongodb };
    default:
      return {};
  }
};

export const RestoresComponent = ({ database, backup }: Props) => {
  const { message } = App.useApp();

  const [editingDatabase, setEditingDatabase] = useState<Database>(
    createInitialEditingDatabase(database),
  );

  const [restores, setRestores] = useState<Restore[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [showingRestoreError, setShowingRestoreError] = useState<Restore | undefined>();

  const [isShowRestore, setIsShowRestore] = useState(false);

  const [cancellingRestoreId, setCancellingRestoreId] = useState<string | undefined>();
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [restoreToCancelId, setRestoreToCancelId] = useState<string | undefined>();

  const [versionMismatchMessage, setVersionMismatchMessage] = useState<string | undefined>();
  const [pendingRestoreDb, setPendingRestoreDb] = useState<Database | undefined>();

  const [savedTargets, setSavedTargets] = useState<SavedRestoreTarget[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | undefined>();
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [isSaveTargetModalOpen, setIsSaveTargetModalOpen] = useState(false);
  const [newTargetName, setNewTargetName] = useState('');
  const [formKey, setFormKey] = useState(0);

  const isReloadInProgress = useRef(false);

  const loadRestores = async () => {
    if (isReloadInProgress.current) {
      return;
    }

    isReloadInProgress.current = true;

    try {
      const restores = await restoreApi.getRestores(backup.id);
      setRestores(restores);
    } catch (e) {
      alert((e as Error).message);
    }

    isReloadInProgress.current = false;
  };

  const doRestore = async (editingDatabase: Database, isSkipVersionCheck: boolean) => {
    try {
      await restoreApi.restoreBackup({
        backupId: backup.id,
        ...getRestorePayload(database, editingDatabase),
        isSkipVersionCheck,
      });
      await loadRestores();

      setIsShowRestore(false);
    } catch (e) {
      const errorMessage = (e as Error).message;

      if (!isSkipVersionCheck && errorMessage.includes('is higher than restore database version')) {
        setVersionMismatchMessage(errorMessage);
        setPendingRestoreDb(editingDatabase);

        return;
      }

      alert(errorMessage);
    }
  };

  const restore = async (editingDatabase: Database) => {
    setVersionMismatchMessage(undefined);
    setPendingRestoreDb(undefined);
    await doRestore(editingDatabase, false);
  };

  const cancelRestore = async (restoreId: string) => {
    setCancellingRestoreId(restoreId);
    try {
      await restoreApi.cancelRestore(restoreId);
      await loadRestores();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCancellingRestoreId(undefined);
    }
  };

  const loadSavedTargets = async () => {
    try {
      const targets = await savedRestoreTargetApi.getSavedRestoreTargets();
      setSavedTargets(targets.filter((t) => t.databaseType === database.type));
    } catch {
      // saved targets are optional, don't alert on failure
    }
  };

  const extractConnectionFields = (db: Database): ConnectionFields => {
    switch (database.type) {
      case DatabaseType.POSTGRES:
        return {
          host: db.postgresql?.host || '',
          port: db.postgresql?.port || 5432,
          username: db.postgresql?.username || '',
          password: db.postgresql?.password || '',
          database: db.postgresql?.database || '',
          sslMode: db.postgresql?.sslMode,
          sslClientCert: db.postgresql?.sslClientCert,
          sslClientKey: db.postgresql?.sslClientKey,
          sslRootCert: db.postgresql?.sslRootCert,
          isExcludeExtensions: db.postgresql?.isExcludeExtensions,
          isRestoreOwnership: db.postgresql?.isRestoreOwnership,
          isRestorePrivileges: db.postgresql?.isRestorePrivileges,
          excludeTables: db.postgresql?.excludeTables,
        };
      case DatabaseType.MYSQL:
        return {
          host: db.mysql?.host || '',
          port: db.mysql?.port || 3306,
          username: db.mysql?.username || '',
          password: db.mysql?.password || '',
          database: db.mysql?.database || '',
          isHttps: db.mysql?.isHttps,
          excludeTables: db.mysql?.excludeTables,
        };
      case DatabaseType.MARIADB:
        return {
          host: db.mariadb?.host || '',
          port: db.mariadb?.port || 3306,
          username: db.mariadb?.username || '',
          password: db.mariadb?.password || '',
          database: db.mariadb?.database || '',
          isHttps: db.mariadb?.isHttps,
          isExcludeEvents: db.mariadb?.isExcludeEvents,
          excludeTables: db.mariadb?.excludeTables,
        };
      case DatabaseType.MONGODB:
        return {
          host: db.mongodb?.host || '',
          port: db.mongodb?.port || 27017,
          username: db.mongodb?.username || '',
          password: db.mongodb?.password || '',
          database: db.mongodb?.database || '',
          authDatabase: db.mongodb?.authDatabase,
          isHttps: db.mongodb?.isHttps,
          isSrv: db.mongodb?.isSrv,
          isDirectConnection: db.mongodb?.isDirectConnection,
          excludeCollections: db.mongodb?.excludeCollections,
        };
      default:
        return { host: '', port: 0, username: '', password: '' };
    }
  };

  const applySavedTarget = (target: SavedRestoreTarget) => {
    const conn = target.connection;
    const updated = { ...editingDatabase };

    switch (database.type) {
      case DatabaseType.POSTGRES:
        updated.postgresql = {
          ...updated.postgresql!,
          host: conn.host,
          port: conn.port,
          username: conn.username,
          password: conn.password,
          database: conn.database || updated.postgresql!.database,
          sslMode: (conn.sslMode as PostgresSslMode) || updated.postgresql!.sslMode,
          sslClientCert: conn.sslClientCert || '',
          sslClientKey: conn.sslClientKey || '',
          sslRootCert: conn.sslRootCert || '',
          isExcludeExtensions: conn.isExcludeExtensions ?? updated.postgresql!.isExcludeExtensions,
          isRestoreOwnership: conn.isRestoreOwnership ?? updated.postgresql!.isRestoreOwnership,
          isRestorePrivileges: conn.isRestorePrivileges ?? updated.postgresql!.isRestorePrivileges,
          excludeTables: conn.excludeTables || updated.postgresql!.excludeTables,
        };
        break;
      case DatabaseType.MYSQL:
        updated.mysql = {
          ...updated.mysql!,
          host: conn.host,
          port: conn.port,
          username: conn.username,
          password: conn.password,
          database: conn.database || updated.mysql!.database,
          isHttps: conn.isHttps ?? updated.mysql!.isHttps,
          excludeTables: conn.excludeTables || updated.mysql!.excludeTables,
        };
        break;
      case DatabaseType.MARIADB:
        updated.mariadb = {
          ...updated.mariadb!,
          host: conn.host,
          port: conn.port,
          username: conn.username,
          password: conn.password,
          database: conn.database || updated.mariadb!.database,
          isHttps: conn.isHttps ?? updated.mariadb!.isHttps,
          isExcludeEvents: conn.isExcludeEvents ?? updated.mariadb!.isExcludeEvents,
          excludeTables: conn.excludeTables || updated.mariadb!.excludeTables,
        };
        break;
      case DatabaseType.MONGODB:
        updated.mongodb = {
          ...updated.mongodb!,
          host: conn.host,
          port: conn.port,
          username: conn.username,
          password: conn.password,
          database: conn.database || updated.mongodb!.database,
          authDatabase: conn.authDatabase || updated.mongodb!.authDatabase,
          isHttps: conn.isHttps ?? updated.mongodb!.isHttps,
          isSrv: conn.isSrv ?? updated.mongodb!.isSrv,
          isDirectConnection: conn.isDirectConnection ?? updated.mongodb!.isDirectConnection,
          excludeCollections: conn.excludeCollections || updated.mongodb!.excludeCollections,
        };
        break;
    }

    setEditingDatabase(updated);
    setSelectedTargetId(target.id);
    setFormKey((k) => k + 1);
  };

  const handleSaveAsTarget = async () => {
    if (!newTargetName.trim()) return;

    setIsSavingTarget(true);
    try {
      const conn = extractConnectionFields(editingDatabase);
      await savedRestoreTargetApi.createSavedRestoreTarget({
        name: newTargetName.trim(),
        databaseType: database.type,
        connection: conn,
      });
      setNewTargetName('');
      setIsSaveTargetModalOpen(false);
      message.success('Restore target saved');
      await loadSavedTargets();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setIsSavingTarget(false);
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
    try {
      await savedRestoreTargetApi.deleteSavedRestoreTarget(targetId);
      setSavedTargets((prev) => prev.filter((t) => t.id !== targetId));
      if (selectedTargetId === targetId) {
        setSelectedTargetId(undefined);
      }
      message.success('Restore target deleted');
    } catch (e) {
      alert((e as Error).message);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadRestores().finally(() => setIsLoading(false));

    const interval = setInterval(() => {
      loadRestores();
    }, 1_000);

    return () => clearInterval(interval);
  }, [backup.id]);

  useEffect(() => {
    if (isShowRestore) {
      loadSavedTargets();
    }
  }, [isShowRestore]);

  const isRestoreInProgress = restores.some(
    (restore) => restore.status === RestoreStatus.IN_PROGRESS,
  );

  return (
    <>
      {versionMismatchMessage && pendingRestoreDb && (
        <Modal
          title="Version mismatch"
          open={!!versionMismatchMessage}
          onCancel={() => {
            setVersionMismatchMessage(undefined);
            setPendingRestoreDb(undefined);
          }}
          maskClosable={false}
          okText="Restore anyway"
          okType="primary"
          okButtonProps={{ danger: true }}
          cancelText="Cancel"
          onOk={() => {
            setVersionMismatchMessage(undefined);
            doRestore(pendingRestoreDb, true);
          }}
        >
          <div className="space-y-3">
            <div className="text-sm">{versionMismatchMessage}</div>
            <div className="rounded border border-yellow-300 bg-yellow-50 p-3 text-sm dark:border-yellow-600 dark:bg-yellow-900/30">
              Forcing a restore across different versions may cause failures or data corruption. Only
              proceed if you understand the risks.
            </div>
          </div>
        </Modal>
      )}

      {showingRestoreError && (
        <Modal
          title="Restore error details"
          open={!!showingRestoreError}
          onCancel={() => setShowingRestoreError(undefined)}
          maskClosable={false}
          footer={
            <Button
              icon={<CopyOutlined />}
              onClick={() => {
                ClipboardHelper.copyToClipboard(showingRestoreError.failMessage || '');
                message.success('Error message copied to clipboard');
              }}
            >
              Copy
            </Button>
          }
        >
          {showingRestoreError.failMessage?.includes('must be owner of extension') && (
            <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 p-3 text-sm dark:border-yellow-600 dark:bg-yellow-900/30">
              <strong>💡 Tip:</strong> This error typically occurs when restoring to managed
              PostgreSQL services (like Yandex Cloud, AWS RDS or similar). Try enabling{' '}
              <strong>&quot;Exclude extensions&quot;</strong> in Advanced settings before restoring.
            </div>
          )}
          <div className="overflow-y-auto text-sm whitespace-pre-wrap" style={{ height: '400px' }}>
            {showingRestoreError.failMessage}
          </div>
        </Modal>
      )}

      {showCancelConfirmation && (
        <ConfirmationComponent
          onConfirm={() => {
            setShowCancelConfirmation(false);
            if (restoreToCancelId) {
              cancelRestore(restoreToCancelId);
            }
            setRestoreToCancelId(undefined);
          }}
          onDecline={() => {
            setShowCancelConfirmation(false);
            setRestoreToCancelId(undefined);
          }}
          description="<strong>⚠️ Warning:</strong> Cancelling this restore will likely leave your database in a corrupted or incomplete state. You will need to recreate the database before attempting another restore.<br/><br/>Are you sure you want to cancel?"
          actionText="Yes, cancel restore"
          actionButtonColor="red"
        />
      )}

      {isShowRestore ? (
        <>
          <div className="my-5 text-sm">
            Enter info of the database we will restore backup to.{' '}
            <u>The empty database for restore should be created before the restore</u>. During the
            restore, all the current data will be cleared
            <br />
            <br />
            Make sure the database is not used right now (most likely you do not want to restore the
            data to the same DB where the backup was made)
          </div>

          <div className="mb-4 flex items-center gap-2">
            {savedTargets.length > 0 && (
              <>
                <Select
                  className="w-[250px]"
                  placeholder="Load a saved target..."
                  value={selectedTargetId}
                  onChange={(id) => {
                    const target = savedTargets.find((t) => t.id === id);
                    if (target) applySavedTarget(target);
                  }}
                  allowClear
                  onClear={() => {
                    setSelectedTargetId(undefined);
                    setEditingDatabase(createInitialEditingDatabase(database));
                    setFormKey((k) => k + 1);
                  }}
                  options={savedTargets.map((t) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                />
                {selectedTargetId && (
                  <Tooltip title="Delete saved target">
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteTarget(selectedTargetId)}
                    />
                  </Tooltip>
                )}
              </>
            )}

            <Tooltip title="Save restore target">
              <Button
                size="small"
                icon={<SaveOutlined />}
                onClick={() => setIsSaveTargetModalOpen(true)}
              />
            </Tooltip>
          </div>

          <Modal
            title="Save restore target"
            open={isSaveTargetModalOpen}
            onOk={handleSaveAsTarget}
            onCancel={() => {
              setIsSaveTargetModalOpen(false);
              setNewTargetName('');
            }}
            confirmLoading={isSavingTarget}
            okText="Save"
            okButtonProps={{ disabled: !newTargetName.trim() }}
          >
            <Input
              placeholder="Enter a name for this target (e.g. Production DB)"
              value={newTargetName}
              onChange={(e) => setNewTargetName(e.target.value)}
              onPressEnter={handleSaveAsTarget}
            />
          </Modal>

          <EditDatabaseSpecificDataComponent
            key={formKey}
            database={editingDatabase}
            onCancel={() => setIsShowRestore(false)}
            isShowBackButton={false}
            onBack={() => setIsShowRestore(false)}
            saveButtonText="Restore to this DB"
            isSaveToApi={false}
            onSaved={(database) => {
              setEditingDatabase({ ...database });
              restore(database);
            }}
            onChange={(database) => {
              setEditingDatabase((prev) => {
                if (JSON.stringify(prev) === JSON.stringify(database)) return prev;
                return { ...database };
              });
            }}
            isRestoreMode={true}
          />
        </>
      ) : (
        <div className="mt-5">
          {isLoading ? (
            <div className="flex w-full justify-center">
              <Spin />
            </div>
          ) : (
            <>
              <Button
                className="w-full"
                type="primary"
                disabled={isRestoreInProgress}
                loading={isRestoreInProgress}
                onClick={() => setIsShowRestore(true)}
              >
                Select database to restore to
              </Button>

              {restores.length === 0 && (
                <div className="my-5 text-center text-gray-400">No restores yet</div>
              )}

              <div className="mt-5">
                {restores.map((restore) => {
                  let restoreDurationMs = 0;
                  if (restore.status === RestoreStatus.IN_PROGRESS) {
                    restoreDurationMs = Date.now() - new Date(restore.createdAt).getTime();
                  } else {
                    restoreDurationMs = restore.restoreDurationMs;
                  }

                  const minutes = Math.floor(restoreDurationMs / 60000);
                  const seconds = Math.floor((restoreDurationMs % 60000) / 1000);
                  const milliseconds = restoreDurationMs % 1000;
                  const duration = `${minutes}m ${seconds}s ${milliseconds}ms`;

                  const backupDurationMs = backup.backupDurationMs;
                  const expectedRestoreDurationMs = backupDurationMs * 5;
                  const expectedRestoreDuration = `${Math.floor(expectedRestoreDurationMs / 60000)}m ${Math.floor((expectedRestoreDurationMs % 60000) / 1000)}s`;

                  return (
                    <div key={restore.id} className="mb-1 rounded border border-gray-200 p-3 text-sm">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex flex-1">
                          <div className="w-[75px] min-w-[75px]">Status</div>

                          {restore.status === RestoreStatus.FAILED && (
                            <Tooltip title="Click to see error details">
                              <div
                                className="flex cursor-pointer items-center text-red-600 underline"
                                onClick={() => setShowingRestoreError(restore)}
                              >
                                <ExclamationCircleOutlined
                                  className="mr-2"
                                  style={{ fontSize: 16, color: '#ff0000' }}
                                />

                                <div>Failed</div>
                              </div>
                            </Tooltip>
                          )}

                          {restore.status === RestoreStatus.COMPLETED && (
                            <div className="flex items-center">
                              <CheckCircleOutlined
                                className="mr-2"
                                style={{ fontSize: 16, color: '#008000' }}
                              />

                              <div>Successful</div>
                            </div>
                          )}

                          {restore.status === RestoreStatus.CANCELED && (
                            <div className="flex items-center text-gray-500">
                              <CloseCircleOutlined
                                className="mr-2"
                                style={{ fontSize: 16, color: '#808080' }}
                              />

                              <div>Canceled</div>
                            </div>
                          )}

                          {restore.status === RestoreStatus.IN_PROGRESS && (
                            <div className="flex items-center font-bold text-blue-600">
                              <SyncOutlined spin />
                              <span className="ml-2">In progress</span>
                            </div>
                          )}
                        </div>

                        {restore.status === RestoreStatus.IN_PROGRESS && (
                          <div className="ml-2">
                            {cancellingRestoreId === restore.id ? (
                              <SyncOutlined spin style={{ fontSize: 16 }} />
                            ) : (
                              <Tooltip title="Cancel restore">
                                <CloseCircleOutlined
                                  className="cursor-pointer"
                                  onClick={() => {
                                    if (cancellingRestoreId) return;
                                    setRestoreToCancelId(restore.id);
                                    setShowCancelConfirmation(true);
                                  }}
                                  style={{
                                    color: '#ff0000',
                                    fontSize: 16,
                                    opacity: cancellingRestoreId ? 0.2 : 1,
                                  }}
                                />
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mb-1 flex">
                        <div className="w-[75px] min-w-[75px]">Started at</div>
                        <div>
                          {dayjs.utc(restore.createdAt).local().format(getUserTimeFormat().format)} (
                          {dayjs.utc(restore.createdAt).local().fromNow()})
                        </div>
                      </div>

                      {restore.status === RestoreStatus.IN_PROGRESS && (
                        <div className="flex">
                          <div className="w-[75px] min-w-[75px]">Duration</div>
                          <div>
                            <div>{duration}</div>
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              Expected restoration time usually 3x-5x longer than the backup duration
                              (sometimes less, sometimes more depending on data type)
                              <br />
                              <br />
                              So it is expected to take up to {expectedRestoreDuration} (usually
                              significantly faster)
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
