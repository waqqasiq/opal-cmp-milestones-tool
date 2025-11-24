"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpalToolFunction = void 0;
const app_sdk_1 = require("@zaiusinc/app-sdk");
// import { AuthSection } from '../data/data';
// import { parseExcelFromCmp } from 'OpalToolExcelParse.ts';
const cmp_1 = require("../cmp");
function toIsoUtc(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateString}`);
    }
    return date.toISOString(); // Always outputs: 2025-11-24T13:15:30.000Z
}
// Define Opal tool metadata  - list of tools and their parameters
const discoveryPayload = {
    'functions': [
        // LP Added: query-excel endpoint to fetch campaigns from CMP Excel
        {
            'name': 'get_excel_details',
            'description': 'Fetch data from excel file',
            'parameters': [
                {
                    'name': 'asset_id',
                    'type': 'string',
                    'description': 'CMP asset ID',
                    'required': true
                }
            ],
            'endpoint': '/tools/get-excel-details',
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
        else {
            return new app_sdk_1.Response(400, 'Invalid path');
        }
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
}
exports.OpalToolFunction = OpalToolFunction;
//# sourceMappingURL=OpalToolFunction.js.map