import { getApplicationServer } from '../../../constants';
import RequestOptions from '../../../shared/api/RequestOptions';
import { apiHelper } from '../../../shared/api/apiHelper';
import type { SavedRestoreTarget } from '../model/SavedRestoreTarget';
import type { CreateSavedRestoreTargetRequest } from '../model/CreateSavedRestoreTargetRequest';
import type { UpdateSavedRestoreTargetRequest } from '../model/UpdateSavedRestoreTargetRequest';

export const savedRestoreTargetApi = {
  async getSavedRestoreTargets(): Promise<SavedRestoreTarget[]> {
    return apiHelper.fetchGetJson<SavedRestoreTarget[]>(
      `${getApplicationServer()}/api/v1/saved-restore-targets`,
    );
  },

  async createSavedRestoreTarget(
    data: CreateSavedRestoreTargetRequest,
  ): Promise<SavedRestoreTarget> {
    const requestOptions = new RequestOptions();
    requestOptions.setBody(JSON.stringify(data));

    return apiHelper.fetchPostJson<SavedRestoreTarget>(
      `${getApplicationServer()}/api/v1/saved-restore-targets`,
      requestOptions,
    );
  },

  async updateSavedRestoreTarget(
    targetId: string,
    data: UpdateSavedRestoreTargetRequest,
  ): Promise<SavedRestoreTarget> {
    const requestOptions = new RequestOptions();
    requestOptions.setBody(JSON.stringify(data));

    return apiHelper.fetchPutJson<SavedRestoreTarget>(
      `${getApplicationServer()}/api/v1/saved-restore-targets/${targetId}`,
      requestOptions,
    );
  },

  async deleteSavedRestoreTarget(targetId: string): Promise<void> {
    return apiHelper.fetchDeleteJson<void>(
      `${getApplicationServer()}/api/v1/saved-restore-targets/${targetId}`,
    );
  },
};
