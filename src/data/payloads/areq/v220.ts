/**
 * AReq v2.2.0 builder.
 *
 * v2.2.0 added the fields documented in
 * `comparison/3DSv2-api-documentation/source/differences.rst` and switched
 * the useful signal on the browser from `browserJavaEnabled` to
 * `browserJavascriptEnabled`. The `whiteListStatus` /
 * `whiteListStatusSource` pair was added in v2.2.0 and renamed in
 * v2.3.1; v2.2.0 still uses the white-prefixed names.
 *
 * v2.2.0 still uses the single-string form of
 * `threeDSRequestorChallengeInd`; the array form arrived in v2.3.1.
 */

import type { Scenario } from '../../../types';
import type { PayloadBuilder } from '../types';
import { AReq_v210_FIXTURE_IDS } from './v210';

const { SERVER_TRANS_ID } = AReq_v210_FIXTURE_IDS;

export const buildAReq_v220: PayloadBuilder = (scenario: Scenario) => {
  const threeDSCompInd =
    scenario.methodPath === 'reused' || scenario.methodPath === 'executed'
      ? 'Y'
      : scenario.methodPath === 'unavailable'
        ? 'U'
        : 'N';

  return {
    messageType: 'AReq',
    messageVersion: '2.2.0',
    threeDSServerTransID: SERVER_TRANS_ID,
    threeDSServerRefNumber: 'SRV-REF-001',
    threeDSRequestorID: 'REQ-MERCH-001',
    threeDSRequestorURL: 'https://merchant.example.com/checkout',
    notificationURL: 'https://gateway.payment.com/3ds-notify_url',
    // v2.2.0: still a single string.
    threeDSRequestorChallengeInd: '01',
    threeDSCompInd,
    deviceChannel: '02',
    messageCategory: '01',
    acquirerBIN: '453201',
    acquirerMerchantID: 'MERCH_987654321',
    acctNumber: '4000123456789010',
    merchantName: 'ExampleMart',
    merchantCountryCode: '840',
    mcc: '5411',
    purchaseAmount: '27998',
    purchaseCurrency: '840',
    purchaseExponent: '2',
    purchaseDate: '20260710160715',
    acctID: 'cust-18370019',
    billAddrCity: 'San Francisco',
    billAddrCountry: '840',
    shipAddrCity: 'San Francisco',
    shipAddrCountry: '840',
    merchantRiskIndicator: {
      shipIndicator: '01',
      deliveryTimeframe: '01',
      reorderItemsInd: '01',
      preOrderPurchaseInd: '01',
    },
    messageExtension: [
      {
        name: 'merchant-risk-v1',
        id: 'ext-risk-001',
        criticalityIndicator: false,
        data: {
          cartValueBand: 'mid',
          accountAgeDays: 620,
        },
      },
    ],
    browserIP: '198.51.100.42',
    browserAcceptHeader: 'text/html,application/xhtml+xml',
    browserLanguage: 'en-US',
    browserUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    browserScreenWidth: '1920',
    browserScreenHeight: '1080',
    browserColorDepth: '24',
    browserTZ: '-360',
    // v2.2.0: JS-enabled is the new useful signal.
    browserJavascriptEnabled: 'true',
    // v2.2.0 additions
    threeDSRequestorDecMaxTime: '1440', // 24 hours in minutes
    threeDSRequestorDecReqInd: 'N',
    whiteListStatus: 'Y',
    whiteListStatusSource: '01', // 01 = 3DS Server
    payTokenSource: 'TOKENISATION_PROVIDER_X',
  };
};
