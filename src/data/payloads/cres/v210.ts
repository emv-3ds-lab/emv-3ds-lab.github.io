/**
 * CRes v2.1.0 builder. `cardholderInfo` is a string in v2.1.0.
 */

import type { PayloadBuilder } from '../types';
import { AReq_v210_FIXTURE_IDS } from '../areq/v210';

const { SERVER_TRANS_ID, ACS_TRANS_ID } = AReq_v210_FIXTURE_IDS;

export const buildCRes_v210: PayloadBuilder = () => ({
  messageType: 'CRes',
  messageVersion: '2.1.0',
  threeDSServerTransID: SERVER_TRANS_ID,
  acsTransID: ACS_TRANS_ID,
  transStatus: 'Y',
  challengeCompletionInd: 'Y',
  cardholderInfo: '',
  messageExtension: [],
});
