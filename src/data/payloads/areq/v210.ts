/**
 * AReq v2.1.0 builder.
 *
 * This is a synthetic payload. It uses *only* fields that existed in the
 * EMV 3DS v2.1.0 message shape (per the EMV 3DS v2.3.1 Core Spec Table B.1
 * and the v2.1.0 → v2.2.0 delta document at
 * `comparison/3DSv2-api-documentation/source/differences.rst`).
 *
 * Notable v2.1.0-only characteristics modelled here:
 *   - `threeDSRequestorChallengeInd` is a single string, not an array.
 *   - `cardholderInfo` (returned in ARes, not AReq) is a string — irrelevant
 *     for AReq but kept consistent in ARes builders.
 *   - `acsRenderingType` (returned in ARes) is the v2-shape object
 *     {acsInterface, acsUiTemplate}; `deviceUserInterfaceMode` was added
 *     in v2.3.1 and is absent here.
 *
 * No field whose `sinceVersion` in `meta/fieldProvenance.ts` is `2.2.0`
 * or later is included in this builder.
 */

import type { Scenario } from '../../../types';
import type { PayloadBuilder } from '../types';

// === Synthetic correlation IDs (research-only). Real IDs come from the
// === 3DS Server / DS / ACS at runtime; the watermarked test values make
// === it obvious in a packet capture that this traffic is from the lab.
const SERVER_TRANS_ID = '8a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
const DS_TRANS_ID = 'd9e8f7a6-b5c4-d3e2-f1a0-b9c8d7e6f5a4';
const ACS_TRANS_ID = 'c7d8e9f0-a1b2-c3d4-e5f6-a7b8c9d0e1f2';
const SERVER_REF = 'SRV-REF-001';
const REQUESTOR_ID = 'REQ-MERCH-001';
const ACQUIRER_BIN = '453201';
const ACQUIRER_MERCH_ID = 'MERCH_987654321';
const PAN = '4000123456789010';
const MERCHANT_NAME = 'ExampleMart';
const MERCHANT_COUNTRY = '840';
const MCC = '5411';
const PURCHASE_AMOUNT = '27998';
const PURCHASE_CURRENCY = '840';
const PURCHASE_EXP = '2';
const PURCHASE_DATE = '20260710160715';
const ACCT_ID = 'cust-18370019';
const BROWSER_IP = '198.51.100.42';
const BROWSER_ACCEPT = 'text/html,application/xhtml+xml';
const BROWSER_LANG = 'en-US';
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';
const REQUESTOR_URL = 'https://merchant.example.com/checkout';
const NOTIFY_URL = 'https://gateway.payment.com/3ds-notify_url';

export const buildAReq_v210: PayloadBuilder = (scenario: Scenario) => {
  // === v2.1.0 threeDSCompInd: a Y/N/U value, not derived from methodPath ===
  // === Method path semantics were added in v2.2.0; v2.1.0 uses a single
  // === field with the same name. The Scenario shape is shared across
  // === versions, so we still key off methodPath for downstream consistency.
  const threeDSCompInd =
    scenario.methodPath === 'reused' || scenario.methodPath === 'executed'
      ? 'Y'
      : scenario.methodPath === 'unavailable'
        ? 'U'
        : 'N';

  return {
    messageType: 'AReq',
    messageVersion: '2.1.0',
    threeDSServerTransID: SERVER_TRANS_ID,
    threeDSServerRefNumber: SERVER_REF,
    threeDSRequestorID: REQUESTOR_ID,
    threeDSRequestorURL: REQUESTOR_URL,
    notificationURL: NOTIFY_URL,
    // v2.1.0: single string. '01' = no preference / prefer frictionless.
    threeDSRequestorChallengeInd: '01',
    threeDSCompInd,
    deviceChannel: '02', // Browser
    messageCategory: '01', // Payment Authentication
    acquirerBIN: ACQUIRER_BIN,
    acquirerMerchantID: ACQUIRER_MERCH_ID,
    acctNumber: PAN,
    merchantName: MERCHANT_NAME,
    merchantCountryCode: MERCHANT_COUNTRY,
    mcc: MCC,
    purchaseAmount: PURCHASE_AMOUNT,
    purchaseCurrency: PURCHASE_CURRENCY,
    purchaseExponent: PURCHASE_EXP,
    purchaseDate: PURCHASE_DATE,
    acctID: ACCT_ID,
    billAddrCity: 'San Francisco',
    billAddrCountry: MERCHANT_COUNTRY,
    shipAddrCity: 'San Francisco',
    shipAddrCountry: MERCHANT_COUNTRY,
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
    browserIP: BROWSER_IP,
    browserAcceptHeader: BROWSER_ACCEPT,
    browserLanguage: BROWSER_LANG,
    browserUserAgent: BROWSER_UA,
    browserScreenWidth: '1920',
    browserScreenHeight: '1080',
    browserColorDepth: '24',
    browserTZ: '-360',
    // v2.1.0 still uses the Java-enabled field; v2.2.0 switches the
    // boolean to "Javascript enabled" because that is the more useful
    // signal for the 3DS Method iframe.
    browserJavaEnabled: 'false',
    // v2.2.0 introduced browserJavascriptEnabled; absent here.
  };
};

export const AReq_v210_FIXTURE_IDS = {
  SERVER_TRANS_ID,
  DS_TRANS_ID,
  ACS_TRANS_ID,
};
