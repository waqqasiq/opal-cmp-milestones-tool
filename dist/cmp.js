"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMilestoneWithinCampaign = void 0;
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
const createMilestoneWithinCampaign = async (campaignId, milestoneData, authData) => {
    try {
        // Validate required fields
        if (!milestoneData.title) {
            throw new Error('title is required.');
        }
        if (!milestoneData.due_date) {
            throw new Error('due_date is required (ISO 8601 UTC).');
        }
        if (!milestoneData.hex_color) {
            throw new Error('hex_color is required (e.g., #4ECFD5).');
        }
        // Validate tasks structure
        // Validate tasks structure
        if (milestoneData.tasks &&
            !milestoneData.tasks.every((t) => t.id)) {
            throw new Error('Each task must be an object containing an \'id\' field.');
        }
        // Headers
        const headers = {
            Accept: 'application/json',
            'x-auth-token-type': 'opti-id',
            Authorization: `${authData.credentials.token_type} ${authData.credentials.access_token}`,
            'Accept-Encoding': 'gzip',
            'x-request-id': generateNumericId(),
            'x-org-sso-id': authData.credentials.org_sso_id,
            'Content-Type': 'application/json'
        };
        const url = `${config_1.CMP_BASE_URL}/v3/milestones`;
        // Build request body
        const requestBody = {
            title: milestoneData.title,
            description: milestoneData.description || null,
            campaign_id: campaignId,
            due_date: milestoneData.due_date,
            hex_color: milestoneData.hex_color,
            tasks: milestoneData.tasks || []
        };
        console.log('CMP Milestone Payload:', requestBody);
        const res = await axios_1.default.post(url, requestBody, { headers });
        return res.data;
    }
    catch (error) {
        console.error('Failed to create milestone:', error.message);
        if (axios_1.default.isAxiosError(error) && error.response) {
            console.error('CMP Error:', error.response.data);
        }
        throw error;
    }
};
exports.createMilestoneWithinCampaign = createMilestoneWithinCampaign;
//# sourceMappingURL=cmp.js.map