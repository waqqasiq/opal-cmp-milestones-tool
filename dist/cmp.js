"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssetFromCMP = void 0;
// import axios from 'axios';
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
function generateNumericId() {
    let id = '';
    for (let i = 0; i < 10; i++) {
        id += Math.floor(Math.random() * 10); // digits 0-9
    }
    return id;
}
// helper to get asset details from  CMP
const getAssetFromCMP = async (assetId, authData) => {
    try {
        const headers = {
            Accept: 'application/json',
            'x-auth-token-type': 'opti-id',
            Authorization: `${authData.credentials.token_type} ${authData.credentials.access_token}`,
            'Accept-Encoding': 'gzip',
            'x-request-id': generateNumericId(),
            'x-org-sso-id': authData.credentials.org_sso_id,
        };
        const url = `${config_1.CMP_BASE_URL}/v3/asset-urls/${assetId}`;
        const res = await axios_1.default.get(url, { headers });
        console.log('res.data ', res.data);
        return res.data;
    }
    catch (error) {
        console.error(`Failed to get task ${assetId}`, error.message);
        throw error;
    }
};
exports.getAssetFromCMP = getAssetFromCMP;
//# sourceMappingURL=cmp.js.map