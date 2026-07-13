/**
 * RReq v2.1.0 builder. The comparison artifact shows `acsRenderingType`
 * already exists in v2.1.0 for the app channel; v2.3.1 only expands the
 * nested object with `deviceUserInterfaceMode`.
 */

import type { PayloadBuilder } from '../types';
import { AReq_v210_FIXTURE_IDS } from '../areq/v210';

const { SERVER_TRANS_ID, DS_TRANS_ID, ACS_TRANS_ID } = AReq_v210_FIXTURE_IDS;

export const buildRReq_v210: PayloadBuilder = () => ({
  messageType: 'RReq',
  messageVersion: '2.1.0',
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
  // `authenticationType` was part of v2.1.0; the v2.2.0 delta document
  // marks it as a "modified data element" (its enum values were
  // extended) and it was renamed to `authenticationMethod` in v2.3.1.
  authenticationType: '02',
  acsRenderingType: { acsInterface: '02', acsUiTemplate: '01' },
});
