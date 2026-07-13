/**
 * Erro (Error message) builders. The comparison artifacts expose the
 * same core wire shape across v2.1.0 / v2.2.0 / v2.3.1, including
 * `sdkTransID` in v2.1.0 for app-channel errors. We keep three thin
 * variants so the registry surface stays uniform.
 */

import type { PayloadBuilder } from '../types';
import { AReq_v210_FIXTURE_IDS } from '../areq/v210';

const { SERVER_TRANS_ID, DS_TRANS_ID, ACS_TRANS_ID } = AReq_v210_FIXTURE_IDS;

const buildErro = (version: '2.1.0' | '2.2.0' | '2.3.1'): PayloadBuilder => () => ({
  messageType: 'Erro',
  messageVersion: version,
  errorCode: '405',
  errorComponent: 'D',
  errorDescription: 'System Connection Failure',
  errorDetail: 'DS unable to establish connection with ACS',
  threeDSServerTransID: SERVER_TRANS_ID,
  dsTransID: DS_TRANS_ID,
  acsTransID: ACS_TRANS_ID,
  sdkTransID: '',
  messageExtension: [],
});

export const buildErro_v210 = buildErro('2.1.0');
export const buildErro_v220 = buildErro('2.2.0');
export const buildErro_v231 = buildErro('2.3.1');
