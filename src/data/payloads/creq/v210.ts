/**
 * CReq v2.1.0 builder. The browser challenge request is small; v2.1.0 has
 * only the original 6 fields documented in Table B.3.
 */

import type { PayloadBuilder } from '../types';
import { AReq_v210_FIXTURE_IDS } from '../areq/v210';

const { SERVER_TRANS_ID, ACS_TRANS_ID } = AReq_v210_FIXTURE_IDS;

export const buildCReq_v210: PayloadBuilder = () => ({
  messageType: 'CReq',
  messageVersion: '2.1.0',
  threeDSServerTransID: SERVER_TRANS_ID,
  acsTransID: ACS_TRANS_ID,
  challengeWindowSize: '05',
  messageExtension: [],
});
