/**
 * RReq v2.2.0 builder. Adds `whiteListStatus` / `whiteListStatusSource`,
 * `sdkTransID`, and `acsRenderingType` per
 * `comparison/3DSv2-api-documentation/source/differences.rst`.
 */

import type { PayloadBuilder } from '../types';
import { AReq_v210_FIXTURE_IDS } from '../areq/v210';

const { SERVER_TRANS_ID, DS_TRANS_ID, ACS_TRANS_ID } = AReq_v210_FIXTURE_IDS;

export const buildRReq_v220: PayloadBuilder = () => ({
  messageType: 'RReq',
  messageVersion: '2.2.0',
  threeDSServerTransID: SERVER_TRANS_ID,
  dsTransID: DS_TRANS_ID,
  acsTransID: ACS_TRANS_ID,
  transStatus: 'Y',
  transStatusReason: '',
  authenticationValue: 'AAABBiiihH8DAAAAAABiSBI=',
  eci: '05',
  challengeCancel: '',
  challengeCancelationIndicator: '',
  challengeCompletionInd: 'Y',
  interactionCounter: '001',
  messageExtension: [],
  whiteListStatus: 'Y',
  whiteListStatusSource: '02',
  sdkTransID: '',
  acsRenderingType: { acsInterface: '02', acsUiTemplate: '01' },
});
