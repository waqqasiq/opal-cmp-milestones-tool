"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssetFromCMP = exports.getMilestonesWithinCampaign = exports.getAllTasksForCampaign = exports.getTasksPage = exports.getCampaignTree = exports.getCampaignById = exports.updateMilestoneWithinCampaign = exports.createMilestoneWithinCampaign = void 0;
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
const updateMilestoneWithinCampaign = async (milestoneId, updateData, authData) => {
    try {
        // Required fields
        if (!updateData.campaign_id) {
            throw new Error('campaign_id is required.');
        }
        if (!updateData.tasks || !Array.isArray(updateData.tasks)) {
            throw new Error('tasks is required and must be an array');
        }
        if (!updateData.tasks.every((t) => t.id)) {
            throw new Error('Each task must contain an id field.');
        }
        // Additional CMP validations
        if (updateData.title && (updateData.title.length < 1 || updateData.title.length > 80)) {
            throw new Error('title must be 1–80 characters.');
        }
        if (updateData.description && updateData.description.length > 250) {
            throw new Error('description cannot exceed 250 characters.');
        }
        const headers = {
            Accept: 'application/json',
            'x-auth-token-type': 'opti-id',
            Authorization: `${authData.credentials.token_type} ${authData.credentials.access_token}`,
            'Accept-Encoding': 'gzip',
            'x-request-id': Date.now().toString(),
            'x-org-sso-id': authData.credentials.org_sso_id,
            'Content-Type': 'application/json'
        };
        const url = `${config_1.CMP_BASE_URL}/v3/milestones/${milestoneId}`;
        console.log('CMP Update Milestone Payload:', updateData);
        const res = await axios_1.default.patch(url, updateData, { headers });
        return res.data;
    }
    catch (error) {
        console.error('Failed to update milestone:', error.message);
        if (axios_1.default.isAxiosError(error) && error.response) {
            console.error('CMP Error:', error.response.data);
        }
        throw error;
    }
};
exports.updateMilestoneWithinCampaign = updateMilestoneWithinCampaign;
const getCampaignById = async (campaignId, authData) => {
    const headers = {
        Accept: 'application/json',
        'x-auth-token-type': 'opti-id',
        Authorization: `${authData.credentials.token_type} ${authData.credentials.access_token}`,
        'Accept-Encoding': 'gzip',
        'x-request-id': generateNumericId(),
        'x-org-sso-id': authData.credentials.org_sso_id
    };
    const url = `${config_1.CMP_BASE_URL}/v3/campaigns/${campaignId}`;
    const res = await axios_1.default.get(url, { headers });
    return res.data;
};
exports.getCampaignById = getCampaignById;
const getCampaignTree = async (campaignId, authData, visited = new Set()) => {
    var _a;
    if (visited.has(campaignId)) {
        return null; // safety guard
    }
    visited.add(campaignId);
    const campaign = await (0, exports.getCampaignById)(campaignId, authData);
    const children = [];
    const childUrls = ((_a = campaign.links) === null || _a === void 0 ? void 0 : _a.child_campaigns) || [];
    for (const childUrl of childUrls) {
        const childId = childUrl.split('/').pop();
        if (!childId)
            continue;
        const childTree = await (0, exports.getCampaignTree)(childId, authData, visited);
        if (childTree) {
            children.push(childTree);
        }
    }
    return {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        is_hidden: campaign.is_hidden,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        reference_id: campaign.reference_id,
        children
    };
};
exports.getCampaignTree = getCampaignTree;
const getTasksPage = async (campaignId, offset, pageSize, authData) => {
    var _a;
    const headers = {
        Accept: 'application/json',
        'x-auth-token-type': 'opti-id',
        Authorization: `${authData.credentials.token_type} ${authData.credentials.access_token}`,
        'Accept-Encoding': 'gzip',
        'x-request-id': generateNumericId(),
        'x-org-sso-id': authData.credentials.org_sso_id
    };
    const params = {
        campaign: campaignId,
        offset,
        page_size: pageSize
    };
    console.log('[CMP][getTasksPage] Request params:', params);
    const res = await axios_1.default.get(`${config_1.CMP_BASE_URL}/v3/tasks`, { headers, params });
    console.log('[CMP][getTasksPage] Response status:', res.status);
    console.log('[CMP][getTasksPage] Response keys:', Object.keys(res.data || {}));
    console.log('[CMP][getTasksPage] Raw response:', JSON.stringify(res.data, null, 2));
    return (_a = res.data.data) !== null && _a !== void 0 ? _a : [];
};
exports.getTasksPage = getTasksPage;
const getAllTasksForCampaign = async (campaignId, authData) => {
    const PAGE_SIZE = 100;
    let offset = 0;
    let allTasks = [];
    console.log('[CMP][getAllTasksForCampaign] Start');
    console.log('[CMP][getAllTasksForCampaign] Campaign ID:', campaignId);
    while (true) {
        console.log(`[CMP][getAllTasksForCampaign] Fetching page: offset=${offset}`);
        const tasks = await (0, exports.getTasksPage)(campaignId, offset, PAGE_SIZE, authData);
        console.log(`[CMP][getAllTasksForCampaign] Fetched ${tasks.length} tasks`);
        allTasks = allTasks.concat(tasks);
        if (tasks.length < PAGE_SIZE) {
            console.log('[CMP][getAllTasksForCampaign] Last page reached');
            break; // no more pages
        }
        offset += PAGE_SIZE;
    }
    console.log('[CMP][getAllTasksForCampaign] Total tasks:', allTasks.length);
    return allTasks;
};
exports.getAllTasksForCampaign = getAllTasksForCampaign;
const getMilestonesWithinCampaign = async (campaignId, authData) => {
    try {
        if (!campaignId) {
            throw new Error('campaignId is required');
        }
        const headers = {
            Accept: 'application/json',
            'x-auth-token-type': 'opti-id',
            Authorization: `${authData.credentials.token_type} ${authData.credentials.access_token}`,
            'Accept-Encoding': 'gzip',
            'x-request-id': generateNumericId(),
            'x-org-sso-id': authData.credentials.org_sso_id
        };
        const url = `${config_1.CMP_BASE_URL}/v3/milestones?campaign_id=${campaignId}`;
        const res = await axios_1.default.get(url, { headers });
        return res.data; // returns { data, pagination }
    }
    catch (error) {
        console.error('Failed to fetch milestones:', error.message);
        if (axios_1.default.isAxiosError(error) && error.response) {
            console.error('CMP Error:', error.response.data);
        }
        throw error;
    }
};
exports.getMilestonesWithinCampaign = getMilestonesWithinCampaign;
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