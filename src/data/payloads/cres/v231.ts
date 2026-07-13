/**
 * CRes v2.3.1 builder. `cardholderInfo` is now an object (same shape as
 * the ARes v2.3.1 change).
 */

import type { PayloadBuilder } from '../types';
import { AReq_v210_FIXTURE_IDS } from '../areq/v210';

const { SERVER_TRANS_ID, ACS_TRANS_ID } = AReq_v210_FIXTURE_IDS;

export const buildCRes_v231: PayloadBuilder = () => ({
  messageType: 'CRes',
  messageVersion: '2.3.1',
  threeDSServerTransID: SERVER_TRANS_ID,
  acsTransID: ACS_TRANS_ID,
  transStatus: 'Y',
  challengeCompletionInd: 'Y',
  cardholderInfo: {
    text: '',
    issuerImage: {},
    paymentSystemImage: {},
  },
  messageExtension: [],
  whitelistingInfoText: '',
});
