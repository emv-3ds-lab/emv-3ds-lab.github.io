/**
 * RReq v2.3.1 builder. Implements all 5 additions and 3 renames
 * documented in
 * `comparison/3DSv2-api-documentation/source/differences_v220_v231.rst`:
 *
 *   - Additions: cardholderInfo, challengeErrorReporting,
 *     deviceBindingStatus, deviceBindingStatusSource, transStatusReasonInfo.
 *   - Renames: authenticationType → authenticationMethod,
 *     whiteListStatus → trustListStatus,
 *     whiteListStatusSource → trustListStatusSource.
 *   - Type change: acsRenderingType gained `deviceUserInterfaceMode`.
 */

import type { PayloadBuilder } from '../types';
import { AReq_v210_FIXTURE_IDS } from '../areq/v210';

const { SERVER_TRANS_ID, DS_TRANS_ID, ACS_TRANS_ID } = AReq_v210_FIXTURE_IDS;

export const buildRReq_v231: PayloadBuilder = () => ({
  messageType: 'RReq',
  messageVersion: '2.3.1',
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
  // Renamed in v2.3.1.
  authenticationMethod: '02', // 02 = frictionless
  trustListStatus: 'Y',
  trustListStatusSource: '02',
  sdkTransID: '',
  // Type-changed: acsRenderingType gained deviceUserInterfaceMode.
  acsRenderingType: {
    acsInterface: '02',
    acsUiTemplate: '01',
    deviceUserInterfaceMode: '01',
  },
  // v2.3.1 new fields
  cardholderInfo: '',
  challengeErrorReporting: '',
  deviceBindingStatus: 'Y',
  deviceBindingStatusSource: '02',
  transStatusReasonInfo: '',
});
