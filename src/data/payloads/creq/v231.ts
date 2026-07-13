/**
 * CReq v2.3.1 builder. Same field set as v2.2.0 (the field-level delta
 * document `differences_v220_v231.rst` covers only AReq/ARes/RReq).
 */

import type { PayloadBuilder } from '../types';
import { AReq_v210_FIXTURE_IDS } from '../areq/v210';

const { SERVER_TRANS_ID, ACS_TRANS_ID } = AReq_v210_FIXTURE_IDS;

export const buildCReq_v231: PayloadBuilder = () => ({
  messageType: 'CReq',
  messageVersion: '2.3.1',
  threeDSServerTransID: SERVER_TRANS_ID,
  acsTransID: ACS_TRANS_ID,
  challengeWindowSize: '05',
  messageExtension: [],
  threeDSRequestorAppURL: '',
  whitelistingDataEntry: '',
});
