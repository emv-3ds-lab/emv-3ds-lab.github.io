/**
 * CReq v2.2.0 builder. Adds `threeDSRequestorAppURL` and
 * `whitelistingDataEntry` per
 * `comparison/3DSv2-api-documentation/source/differences.rst`.
 */

import type { PayloadBuilder } from '../types';
import { AReq_v210_FIXTURE_IDS } from '../areq/v210';

const { SERVER_TRANS_ID, ACS_TRANS_ID } = AReq_v210_FIXTURE_IDS;

export const buildCReq_v220: PayloadBuilder = () => ({
  messageType: 'CReq',
  messageVersion: '2.2.0',
  threeDSServerTransID: SERVER_TRANS_ID,
  acsTransID: ACS_TRANS_ID,
  challengeWindowSize: '05',
  messageExtension: [],
  threeDSRequestorAppURL: '',
  whitelistingDataEntry: '',
});
