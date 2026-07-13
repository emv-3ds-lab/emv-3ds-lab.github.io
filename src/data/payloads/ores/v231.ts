/**
 * ORes builder — App-channel only, added in v2.3.0. Modelled per
 * EMV 3DS v2.3.1 Core Spec Table B.11.
 */

import type { PayloadBuilder } from '../types';
import { AReq_v210_FIXTURE_IDS } from '../areq/v210';

const { SERVER_TRANS_ID, ACS_TRANS_ID } = AReq_v210_FIXTURE_IDS;

export const buildORes_v231: PayloadBuilder = () => ({
  messageType: 'ORes',
  messageVersion: '2.3.1',
  threeDSServerTransID: SERVER_TRANS_ID,
  sdkTransID: 'sdk-tx-001',
  acsTransID: ACS_TRANS_ID,
  transStatus: 'Y',
  transStatusReason: '',
  authenticationValue: 'AAABBiiihH8DAAAAAABiSBI=',
  eci: '05',
  messageExtension: [],
  errorCode: '',
  errorDescription: '',
  errorDetail: '',
});
