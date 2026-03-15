"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpalToolFunction = void 0;
const app_sdk_1 = require("@zaiusinc/app-sdk");
// import { AuthSection } from '../data/data';
// import { parseExcelFromCmp } from 'OpalToolExcelParse.ts';
const xlsx_1 = __importDefault(require("xlsx"));
const axios_1 = __importDefault(require("axios"));
const cmp_1 = require("../cmp");
function toIsoUtc(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateString}`);
    }
    return date.toISOString(); // Always outputs: 2025-11-24T13:15:30.000Z
}
function safeCellValue(value) {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'string') {
        return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return '';
}
// Define Opal tool metadata  - list of tools and their parameters
const discoveryPayload = {
    'functions': [
        {
            'name': 'create_milestone_within_campaign',
            'description': 'Create a milestone inside a CMP campaign',
            'parameters': [
                {
                    'name': 'campaign_id',
                    'type': 'string',
                    'description': 'The CMP campaign ID',
                    'required': true
                },
                {
                    'name': 'title',
                    'type': 'string',
                    'description': 'Title of the milestone',
                    'required': true
                },
                {
                    'name': 'description',
                    'type': 'string',
                    'description': 'Description of the milestone (optional)',
                    'required': false
                },
                {
                    'name': 'due_date',
                    'type': 'string',
                    'description': 'Due date in ISO 8601 UTC format e.g. 2025-11-24T13:15:30Z',
                    'required': true
                },
                {
                    'name': 'hex_color',
                    'type': 'string',
                    'description': 'Hex color code for the milestone label',
                    'required': false
                },
                {
                    'name': 'tasks',
                    'type': 'array',
                    'description': 'List of task objects with format [{ id: string }]',
                    'required': false
                }
            ],
            'endpoint': '/tools/create-milestone-within-campaign',
            'http_method': 'POST',
            'auth_requirements': [
                {
                    'provider': 'OptiID',
                    'scope_bundle': 'default',
                    'required': true
                }
            ]
        },
        {
            'name': 'update_milestone_within_campaign',
            'description': 'Update a milestone inside a CMP campaign',
            'parameters': [
                {
                    'name': 'id',
                    'type': 'string',
                    'description': 'The milestone ID to update',
                    'required': true
                },
                {
                    'name': 'title',
                    'type': 'string',
                    'description': 'Updated title (1–80 chars)',
                    'required': false
                },
                {
                    'name': 'description',
                    'type': 'string',
                    'description': 'Updated description (1–250 chars)',
                    'required': false
                },
                {
                    'name': 'campaign_id',
                    'type': 'string',
                    'description': 'Campaign ID to associate with this milestone',
                    'required': true
                },
                {
                    'name': 'due_date',
                    'type': 'string',
                    'description': 'Updated ISO 8601 UTC due date',
                    'required': false
                },
                {
                    'name': 'hex_color',
                    'type': 'string',
                    'description': 'Updated hex color code',
                    'required': false
                },
                {
                    'name': 'tasks',
                    'type': 'array',
                    'description': 'List of task objects [{ id: string }]',
                    'required': true
                }
            ],
            'endpoint': '/tools/update-milestone-within-campaign',
            'http_method': 'PATCH',
            'auth_requirements': [
                {
                    'provider': 'OptiID',
                    'scope_bundle': 'default',
                    'required': true
                }
            ]
        },
        {
            name: 'get_child_campaigns',
            description: 'Fetch a campaign and recursively retrieve all child/sub-campaigns',
            parameters: [
                {
                    name: 'campaign_id',
                    type: 'string',
                    description: 'Root CMP campaign ID',
                    required: true
                }
            ],
            endpoint: '/tools/get-child-campaigns',
            http_method: 'POST',
            auth_requirements: [
                {
                    provider: 'OptiID',
                    scope_bundle: 'default',
                    required: true
                }
            ]
        },
        {
            name: 'get_campaign_tasks',
            description: 'Fetch all tasks under a CMP campaign (paginated)',
            parameters: [
                {
                    name: 'campaign_id',
                    type: 'string',
                    description: 'CMP campaign ID',
                    required: true
                }
            ],
            endpoint: '/tools/get-campaign-tasks',
            http_method: 'POST',
            auth_requirements: [
                {
                    provider: 'OptiID',
                    scope_bundle: 'default',
                    required: true
                }
            ]
        },
        {
            name: 'get_milestones_within_campaign',
            description: 'Fetch all milestones within a CMP campaign',
            parameters: [
                {
                    name: 'campaign_id',
                    type: 'string',
                    description: 'CMP campaign ID',
                    required: true
                }
            ],
            endpoint: '/tools/get-milestones-within-campaign',
            http_method: 'POST',
            auth_requirements: [
                {
                    provider: 'OptiID',
                    scope_bundle: 'default',
                    required: true
                }
            ]
        },
        {
            name: 'generate_event_deck_from_excel',
            description: 'Generate Q1 event slides JSON from CMP Excel asset',
            parameters: [
                {
                    name: 'asset_id',
                    type: 'string',
                    description: 'CMP Excel asset ID',
                    required: true
                }
            ],
            endpoint: '/tools/generate-event-deck-from-excel',
            http_method: 'POST',
            auth_requirements: [
                {
                    provider: 'OptiID',
                    scope_bundle: 'default',
                    required: true
                }
            ]
        },
        {
            name: 'excel_lookup_merge',
            description: 'Lookup values from Excel File1 into Excel File2 and append selected columns',
            parameters: [
                {
                    name: 'excel_file1_id',
                    type: 'string',
                    description: 'Opal file ID of Excel File1 (lookup source)',
                    required: true
                },
                {
                    name: 'excel_file2_id',
                    type: 'string',
                    description: 'Opal file ID of Excel File2 (target file)',
                    required: true
                },
                {
                    name: 'file1_match_column',
                    type: 'string',
                    description: 'Column name in Excel File1 used for lookup',
                    required: true
                },
                {
                    name: 'file2_match_column',
                    type: 'string',
                    description: 'Column name in Excel File2 used for lookup',
                    required: true
                },
                {
                    name: 'append_columns',
                    type: 'array',
                    description: 'Columns from Excel File1 to append into Excel File2',
                    required: true
                }
            ],
            endpoint: '/tools/excel-lookup-merge',
            http_method: 'POST',
            auth_requirements: [
                {
                    provider: 'OptiID',
                    scope_bundle: 'default',
                    required: true
                }
            ]
        },
        {
            name: 'csv_merge_lookup',
            description: `Merge two CSV files by performing a lookup between matching columns and 
      appending selected columns from File1 to File2.`,
            parameters: [
                {
                    name: 'excel_file1_id',
                    type: 'string',
                    description: 'File ID of the source CSV file',
                    required: true
                },
                {
                    name: 'excel_file2_id',
                    type: 'string',
                    description: 'File ID of the target CSV file',
                    required: true
                },
                {
                    name: 'file1_match_column',
                    type: 'string',
                    description: 'Column name in File1 used for matching',
                    required: true
                },
                {
                    name: 'file2_match_column',
                    type: 'string',
                    description: 'Column name in File2 used for matching',
                    required: true
                },
                {
                    name: 'append_columns',
                    type: 'array',
                    description: 'Columns from File1 that should be appended to File2',
                    required: true
                }
            ],
            endpoint: '/tools/csv-merge-lookup',
            http_method: 'POST',
            auth_requirements: [
                {
                    provider: 'OptiID',
                    scope_bundle: 'default',
                    required: true
                }
            ]
        }
    ]
};
/**
 * class that implements the Opal tool functions. Requirements:
 * - Must extend the Function class from the SDK
 * - Name must match the value of entry_point property from app.yml manifest
 * - Name must match the file name
 */
class OpalToolFunction extends app_sdk_1.Function {
    /**
     * Processing the request from Opal
     * Add your logic here to handle every tool declared in the discoveryPayload.
     */
    async perform() {
        // uncomment the following lines to enable bearer token authentication
        /*
        const bearerToken = (await storage.settings.get('bearer_token')).bearer_token as string;
        if (bearerToken && this.request.headers.get('Authorization') !== `Bearer ${bearerToken}`) {
          logger.warn('Invalid or missing bearer token', JSON.stringify(this.request));
          return new Response(401, 'Invalid or missing bearer token');
        }
        */
        /*
         * example: fetching configured username/password credentials
         *
        const auth = await storage.settings.get<AuthSection>('auth');
        */
        /*
         * example: fetching Google Oauth token from secret storage
         *
         const token = await storage.secrets.get<Token>('token');
         */
        if (this.request.path === '/discovery') {
            return new app_sdk_1.Response(200, discoveryPayload);
        }
        else if (this.request.path === '/tools/create-milestone-within-campaign') {
            const params = this.extractParameters();
            const authData = this.extractAuthData();
            const response = await this.createMilestoneWithinCampaign(params, authData);
            return new app_sdk_1.Response(200, response);
        }
        else if (this.request.path === '/tools/update-milestone-within-campaign') {
            const params = this.extractParameters();
            const authData = this.extractAuthData();
            const response = await this.updateMilestoneWithinCampaign(params, authData);
            return new app_sdk_1.Response(200, response);
        }
        else if (this.request.path === '/tools/get-child-campaigns') {
            const params = this.extractParameters();
            const authData = this.extractAuthData();
            const response = await this.getChildCampaigns(params, authData);
            return new app_sdk_1.Response(200, response);
        }
        else if (this.request.path === '/tools/get-campaign-tasks') {
            const params = this.extractParameters();
            const authData = this.extractAuthData();
            const response = await this.getCampaignTasks(params, authData);
            return new app_sdk_1.Response(200, response);
        }
        else if (this.request.path === '/tools/get-milestones-within-campaign') {
            const params = this.extractParameters();
            const authData = this.extractAuthData();
            const response = await this.getMilestonesWithinCampaign(params, authData);
            return new app_sdk_1.Response(200, response);
        }
        else if (this.request.path === '/tools/generate-event-deck-from-excel') {
            const params = this.extractParameters();
            const authData = this.extractAuthData();
            const response = await this.generateEventDeckFromExcel(params, authData);
            return new app_sdk_1.Response(200, response);
        }
        else if (this.request.path === '/tools/excel-lookup-merge') {
            const params = this.extractParameters();
            const authData = this.extractAuthData();
            const response = await this.excelLookupMerge(params, authData);
            return new app_sdk_1.Response(200, response);
        }
        else if (this.request.path === '/tools/csv-merge-lookup') {
            const params = this.extractParameters();
            const authData = this.extractAuthData();
            const response = await this.csvMergeLookup(params, authData);
            return new app_sdk_1.Response(200, response);
        }
        else {
            return new app_sdk_1.Response(400, 'Invalid path');
        }
    }
    async excelLookupMerge(parameters, authData) {
        const { excel_file1_id, excel_file2_id, file1_match_column, file2_match_column, append_columns } = parameters;
        if (!excel_file1_id)
            throw new Error('excel_file1_id is required');
        if (!excel_file2_id)
            throw new Error('excel_file2_id is required');
        const headers = {
            Authorization: `Bearer ${authData.credentials.access_token}`,
            'x-instance-id': authData.credentials.instance_id,
            'x-product-sku': authData.credentials.product_sku,
            'x-request-id': Date.now().toString()
        };
        try {
            app_sdk_1.logger.info('Downloading files from Opal backend');
            const file1Buffer = await this.downloadOpalFile(excel_file1_id, headers);
            const file2Buffer = await this.downloadOpalFile(excel_file2_id, headers);
            const resultBuffer = this.dynamicLookupExcel(file1Buffer, file2Buffer, file1_match_column, file2_match_column, append_columns);
            return {
                message: 'Lookup completed successfully',
                result_file_base64: resultBuffer.toString('base64')
            };
        }
        catch (error) {
            app_sdk_1.logger.error('Excel lookup failed', error.message);
            throw new Error('Excel lookup failed');
        }
    }
    async csvMergeLookup(parameters, authData) {
        var _a;
        const { excel_file1_id, excel_file2_id, file1_match_column, file2_match_column, append_columns } = parameters;
        try {
            if (!excel_file1_id) {
                throw new Error('excel_file1_id is required');
            }
            if (!excel_file2_id) {
                throw new Error('excel_file2_id is required');
            }
            app_sdk_1.logger.info('Fetching CSV files from Opal File Service');
            const file1Response = await axios_1.default.get(`https://opal-backend.optimizely.com/v1/file/${excel_file1_id}`, {
                headers: {
                    Authorization: `Bearer ${authData.credentials.access_token}`
                }
            });
            const file2Response = await axios_1.default.get(`https://opal-backend.optimizely.com/v1/file/${excel_file2_id}`, {
                headers: {
                    Authorization: `Bearer ${authData.credentials.access_token}`
                }
            });
            const csv1 = file1Response.data;
            const csv2 = file2Response.data;
            app_sdk_1.logger.info('Parsing CSV files');
            const workbook1 = xlsx_1.default.read(csv1, { type: 'string' });
            const workbook2 = xlsx_1.default.read(csv2, { type: 'string' });
            const sheet1 = xlsx_1.default.utils.sheet_to_json(workbook1.Sheets[workbook1.SheetNames[0]]);
            const sheet2 = xlsx_1.default.utils.sheet_to_json(workbook2.Sheets[workbook2.SheetNames[0]]);
            app_sdk_1.logger.info(`File1 rows: ${sheet1.length}`);
            app_sdk_1.logger.info(`File2 rows: ${sheet2.length}`);
            const lookupMap = new Map();
            for (const row of sheet1) {
                const key = safeCellValue(row[file1_match_column]);
                if (key) {
                    lookupMap.set(key, row);
                }
            }
            app_sdk_1.logger.info(`Lookup map built with ${lookupMap.size} entries`);
            const mergedRows = [];
            for (const row of sheet2) {
                const key = safeCellValue(row[file2_match_column]);
                const match = lookupMap.get(key);
                const mergedRow = { ...row };
                if (match) {
                    for (const column of append_columns) {
                        mergedRow[column] = (_a = match[column]) !== null && _a !== void 0 ? _a : '';
                    }
                }
                else {
                    for (const column of append_columns) {
                        mergedRow[column] = '';
                    }
                }
                mergedRows.push(mergedRow);
            }
            app_sdk_1.logger.info('CSV merge complete');
            const resultSheet = xlsx_1.default.utils.json_to_sheet(mergedRows);
            const csvOutput = xlsx_1.default.utils.sheet_to_csv(resultSheet);
            return {
                message: 'Lookup completed successfully',
                csv_content: csvOutput
            };
        }
        catch (error) {
            if (error instanceof Error) {
                app_sdk_1.logger.error('CSV lookup merge failed:', error.message);
            }
            else {
                app_sdk_1.logger.error('CSV lookup merge failed with unknown error');
            }
            throw new Error('Failed to merge CSV files');
        }
    }
    async downloadOpalFile(fileId, headers) {
        const url = `https://opal-backend.optimizely.com/v1/file/${fileId}`;
        const response = await axios_1.default.get(url, {
            headers,
            responseType: 'arraybuffer'
        });
        return Buffer.from(response.data);
    }
    dynamicLookupExcel(file1Buffer, file2Buffer, file1MatchCol, file2MatchCol, appendColumns) {
        const wb1 = xlsx_1.default.read(file1Buffer, { type: 'buffer' });
        const wb2 = xlsx_1.default.read(file2Buffer, { type: 'buffer' });
        const sheet1 = wb1.SheetNames[0];
        const sheet2 = wb2.SheetNames[0];
        const file1 = xlsx_1.default.utils.sheet_to_json(wb1.Sheets[sheet1]);
        const file2 = xlsx_1.default.utils.sheet_to_json(wb2.Sheets[sheet2]);
        if (!file1.length || !file2.length) {
            throw new Error('One of the Excel files is empty');
        }
        const lookupMap = new Map();
        for (const row of file1) {
            const key = row[file1MatchCol];
            if (!lookupMap.has(key)) {
                lookupMap.set(key, row);
            }
        }
        const updated = file2.map((row) => {
            const key = row[file2MatchCol];
            const match = lookupMap.get(key);
            if (match) {
                appendColumns.forEach((col) => {
                    row[col] = match[col];
                });
            }
            return row;
        });
        const newSheet = xlsx_1.default.utils.json_to_sheet(updated);
        const newWorkbook = xlsx_1.default.utils.book_new();
        xlsx_1.default.utils.book_append_sheet(newWorkbook, newSheet, 'Result');
        return xlsx_1.default.write(newWorkbook, {
            type: 'buffer',
            bookType: 'xlsx'
        });
    }
    extractAuthData() {
        // Extract auth data from the request headers
        if (this.request.bodyJSON && this.request.bodyJSON.auth) {
            // Standard format: { "parameters": { ... } }
            app_sdk_1.logger.info('Extracted authData from \'auth\' key:', this.request.bodyJSON.auth);
            return this.request.bodyJSON.auth;
        }
        else {
            // Fallback for direct testing: { "name": "value" }
            app_sdk_1.logger.warn('\'auth\' key not found in request body. Using body directly.');
            return this.request.bodyJSON;
        }
    }
    extractParameters() {
        // Extract parameters from the request body
        if (this.request.bodyJSON && this.request.bodyJSON.parameters) {
            // Standard format: { "parameters": { ... } }
            app_sdk_1.logger.info('Extracted parameters from \'parameters\' key:', this.request.bodyJSON.parameters);
            return this.request.bodyJSON.parameters;
        }
        else {
            // Fallback for direct testing: { "name": "value" }
            app_sdk_1.logger.warn('\'parameters\' key not found in request body. Using body directly.');
            return this.request.bodyJSON;
        }
    }
    async createMilestoneWithinCampaign(parameters, authData) {
        const { campaign_id, title, description, hex_color, tasks } = parameters;
        let { due_date } = parameters;
        try {
            if (!campaign_id)
                throw new Error('campaign_id is required');
            if (!title)
                throw new Error('title is required');
            if (!due_date)
                throw new Error('due_date is required');
            due_date = toIsoUtc(due_date);
            const milestonePayload = {
                title,
                description: description || null,
                due_date,
                hex_color: hex_color || '#4ECFD5',
                tasks: tasks || []
            };
            app_sdk_1.logger.info('Creating milestone with payload:', milestonePayload);
            const result = await (0, cmp_1.createMilestoneWithinCampaign)(campaign_id, milestonePayload, authData);
            return { milestone: result };
        }
        catch (error) {
            console.error('Error creating milestone:', error.message);
            throw new Error('Failed to create milestone in CMP');
        }
    }
    async updateMilestoneWithinCampaign(parameters, authData) {
        const { id, title, description, campaign_id, hex_color, tasks } = parameters;
        let { due_date } = parameters;
        try {
            if (!id)
                throw new Error('Milestone "id" is required');
            if (!campaign_id)
                throw new Error('"campaign_id" is required');
            if (!tasks)
                throw new Error('"tasks" is required and must be an array');
            if (due_date) {
                due_date = toIsoUtc(due_date);
            }
            const payload = {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                campaign_id,
                ...(due_date && { due_date }),
                ...(hex_color && { hex_color }),
                tasks // required
            };
            app_sdk_1.logger.info('Updating milestone with payload:', payload);
            const result = await (0, cmp_1.updateMilestoneWithinCampaign)(id, payload, authData);
            return { milestone: result };
        }
        catch (error) {
            console.error('Error updating milestone:', error.message);
            throw new Error('Failed to update milestone in CMP');
        }
    }
    async getChildCampaigns(parameters, authData) {
        const { campaign_id } = parameters;
        if (!campaign_id) {
            throw new Error('campaign_id is required');
        }
        try {
            const tree = await (0, cmp_1.getCampaignTree)(campaign_id, authData);
            return tree;
        }
        catch (error) {
            app_sdk_1.logger.error('Error fetching child campaigns:', error.message);
            throw new Error('Failed to fetch child campaigns from CMP');
        }
    }
    async getCampaignTasks(parameters, authData) {
        const { campaign_id } = parameters;
        console.log('[Opal][getCampaignTasks] Params:', parameters);
        console.log('[Opal][getCampaignTasks] Auth org_sso_id:', authData.credentials.org_sso_id);
        if (!campaign_id) {
            throw new Error('campaign_id is required');
        }
        try {
            const tasks = await (0, cmp_1.getAllTasksForCampaign)(campaign_id, authData);
            console.log('[Opal][getCampaignTasks] Returning tasks:', tasks.length);
            return { tasks };
        }
        catch (error) {
            app_sdk_1.logger.error('Error fetching campaign tasks:', error.message);
            throw new Error('Failed to fetch campaign tasks from CMP');
        }
    }
    async getMilestonesWithinCampaign(parameters, authData) {
        const { campaign_id } = parameters;
        if (!campaign_id) {
            throw new Error('campaign_id is required');
        }
        try {
            const milestones = await (0, cmp_1.getMilestonesWithinCampaign)(campaign_id, authData);
            return { milestones };
        }
        catch (error) {
            app_sdk_1.logger.error('Error fetching milestones:', error.message);
            throw new Error('Failed to fetch milestones from CMP');
        }
    }
    async generateEventDeckFromExcel(parameters, authData) {
        var _a, _b;
        var _c, _d, _e;
        const { asset_id } = parameters;
        if (!asset_id) {
            throw new Error('asset_id is required');
        }
        const assetDetails = await (0, cmp_1.getAssetFromCMP)(asset_id, authData);
        const buffer = await this.downloadFileAsBuffer(assetDetails.url);
        const workbook = xlsx_1.default.read(buffer, { cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) {
            throw new Error('No worksheet found in Excel');
        }
        const rows = xlsx_1.default.utils.sheet_to_json(sheet, {
            range: 10,
            defval: ''
        });
        const MONTHS_IN_SCOPE = ['January', 'February', 'March'];
        const ALLOWED_LOBS = new Set([
            'Asset Management & Private Equity',
            'Products',
            'Government & Healthcare',
            'Financial Services',
            'Other'
        ]);
        const normalized = rows.flatMap((row) => {
            if (!row['Event Begin Date'] || !row['LOB Description'] || !row['Title']) {
                return [];
            }
            const start = new Date(row['Event Begin Date']);
            if (isNaN(start.getTime())) {
                return [];
            }
            const month = start.toLocaleString('en-US', { month: 'long' });
            if (!MONTHS_IN_SCOPE.includes(month)) {
                return [];
            }
            const lobs = String(row['LOB Description'])
                .split(',')
                .map((l) => l.trim())
                .filter((l) => ALLOWED_LOBS.has(l));
            if (!lobs.length) {
                return [];
            }
            const isMultiLob = lobs.length > 1;
            return lobs.map((lob) => ({
                month,
                lob,
                category: this.getEventCategory(row['Event Type'] || ''),
                title: row['Title'],
                date: start.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                }),
                stakeholder: this.extractFirst(row['Business Stakeholder']),
                city: this.extractFirst(row['Business Area']),
                isMultiLob
            }));
        });
        const grouped = {};
        for (const e of normalized) {
            (_a = grouped[_c = e.month]) !== null && _a !== void 0 ? _a : (grouped[_c] = {});
            (_b = (_d = grouped[e.month])[_e = e.lob]) !== null && _b !== void 0 ? _b : (_d[_e] = { 'in-person': [], online: [] });
            grouped[e.month][e.lob][e.category].push(e);
        }
        const slides = this.buildSlidesJson(grouped);
        return { slides };
    }
    buildSlidesJson(grouped) {
        const slides = [];
        for (const month of Object.keys(grouped)) {
            for (const lob of Object.keys(grouped[month])) {
                const inPerson = grouped[month][lob]['in-person'].map((e) => ({
                    title: e.title,
                    date: e.date,
                    stakeholder: e.stakeholder,
                    city: e.city,
                    isMultiLob: e.isMultiLob
                }));
                const online = grouped[month][lob].online.map((e) => ({
                    title: e.title,
                    date: e.date,
                    stakeholder: e.stakeholder,
                    city: e.city,
                    isMultiLob: e.isMultiLob
                }));
                slides.push({
                    month,
                    lob,
                    legend: 'Italicized event – Event is aligned to more than one LOB',
                    inPerson,
                    online
                });
            }
        }
        return slides;
    }
    extractFirst(value) {
        return (String(value || '')
            .split(/[,;]/)
            .map((v) => v.trim())
            .filter(Boolean)[0] || '—');
    }
    getEventCategory(eventType = '') {
        const v = eventType.toLowerCase();
        if (v.includes('online') || v.includes('webcast') || v.includes('virtual')) {
            return 'online';
        }
        return 'in-person';
    }
    async downloadFileAsBuffer(url) {
        const res = await axios_1.default.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(res.data);
    }
}
exports.OpalToolFunction = OpalToolFunction;
//# sourceMappingURL=OpalToolFunction.js.map