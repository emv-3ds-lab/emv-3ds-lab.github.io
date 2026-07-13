/**
 * CRes v2.2.0 builder. Adds `whitelistingInfoText` per
 * `comparison/3DSv2-api-documentation/source/differences.rst`.
 */

import type { PayloadBuilder } from '../types';
import { AReq_v210_FIXTURE_IDS } from '../areq/v210';

const { SERVER_TRANS_ID, ACS_TRANS_ID } = AReq_v210_FIXTURE_IDS;

export const buildCRes_v220: PayloadBuilder = () => ({
  messageType: 'CRes',
  messageVersion: '2.2.0',
  threeDSServerTransID: SERVER_TRANS_ID,
  acsTransID: ACS_TRANS_ID,
  transStatus: 'Y',
  challengeCompletionInd: 'Y',
  cardholderInfo: '',
  messageExtension: [],
  whitelistingInfoText: '',
});
