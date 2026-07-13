/**
 * OReq builder — App-channel only, added in v2.3.0. Modelled per
 * EMV 3DS v2.3.1 Core Spec Table B.10.
 */

import type { PayloadBuilder } from '../types';
import { AReq_v210_FIXTURE_IDS } from '../areq/v210';

const { SERVER_TRANS_ID } = AReq_v210_FIXTURE_IDS;

export const buildOReq_v231: PayloadBuilder = () => ({
  messageType: 'OReq',
  messageVersion: '2.3.1',
  threeDSServerTransID: SERVER_TRANS_ID,
  sdkTransID: 'sdk-tx-001',
  messageExtension: [],
});
