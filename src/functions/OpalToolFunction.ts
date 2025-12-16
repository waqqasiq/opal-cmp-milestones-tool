import { logger, Function, Response } from '@zaiusinc/app-sdk';
// import { AuthSection } from '../data/data';
// import { parseExcelFromCmp } from 'OpalToolExcelParse.ts';
import { createMilestoneWithinCampaign, updateMilestoneWithinCampaign, getCampaignTree, getAllTasksForCampaign } from '../cmp';


interface OptiAuthData {
  provider: string;
  credentials: {
    token_type: string;
    access_token: string;
    org_sso_id: string;
    user_id: string;
    instance_id: string;
    customer_id: string;
    product_sku: string;
  };
}

function toIsoUtc(dateString: string): string {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}`);
  }

  return date.toISOString(); // Always outputs: 2025-11-24T13:15:30.000Z
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
    }

  ]
};

/**
 * class that implements the Opal tool functions. Requirements:
 * - Must extend the Function class from the SDK
 * - Name must match the value of entry_point property from app.yml manifest
 * - Name must match the file name
 */
export class OpalToolFunction extends Function {

  /**
   * Processing the request from Opal
   * Add your logic here to handle every tool declared in the discoveryPayload.
   */
  public async perform(): Promise<Response> {
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
      return new Response(200, discoveryPayload);
    } else if (this.request.path === '/tools/create-milestone-within-campaign') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.createMilestoneWithinCampaign(params, authData);

      return new Response(200, response);

    } else if (this.request.path === '/tools/update-milestone-within-campaign') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.updateMilestoneWithinCampaign(params, authData);

      return new Response(200, response);
    } else if (this.request.path === '/tools/get-child-campaigns') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.getChildCampaigns(params, authData);
      return new Response(200, response);

    } else if (this.request.path === '/tools/get-campaign-tasks') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.getCampaignTasks(params, authData);
      return new Response(200, response);
    } else {
      return new Response(400, 'Invalid path');
    }
  }

  private extractAuthData() {
    // Extract auth data from the request headers
    if (this.request.bodyJSON && this.request.bodyJSON.auth) {
      // Standard format: { "parameters": { ... } }
      logger.info('Extracted authData from \'auth\' key:', this.request.bodyJSON.auth);
      return this.request.bodyJSON.auth;
    } else {
      // Fallback for direct testing: { "name": "value" }
      logger.warn('\'auth\' key not found in request body. Using body directly.');
      return this.request.bodyJSON;
    }
  }

  private extractParameters() {
    // Extract parameters from the request body
    if (this.request.bodyJSON && this.request.bodyJSON.parameters) {
      // Standard format: { "parameters": { ... } }
      logger.info('Extracted parameters from \'parameters\' key:', this.request.bodyJSON.parameters);
      return this.request.bodyJSON.parameters;
    } else {
      // Fallback for direct testing: { "name": "value" }
      logger.warn('\'parameters\' key not found in request body. Using body directly.');
      return this.request.bodyJSON;
    }
  }

  private async createMilestoneWithinCampaign(parameters: any, authData: OptiAuthData) {
    const { campaign_id, title, description, hex_color, tasks } = parameters;
    let { due_date } = parameters;

    try {
      if (!campaign_id) throw new Error('campaign_id is required');
      if (!title) throw new Error('title is required');
      if (!due_date) throw new Error('due_date is required');

      due_date = toIsoUtc(due_date);

      const milestonePayload = {
        title,
        description: description || null,
        due_date,
        hex_color: hex_color || '#4ECFD5',
        tasks: tasks || []
      };

      logger.info('Creating milestone with payload:', milestonePayload);

      const result = await createMilestoneWithinCampaign(
        campaign_id,
        milestonePayload,
        authData
      );

      return { milestone: result };

    } catch (error: any) {
      console.error('Error creating milestone:', error.message);
      throw new Error('Failed to create milestone in CMP');
    }
  }

  private async updateMilestoneWithinCampaign(parameters: any, authData: OptiAuthData) {
    const { id, title, description, campaign_id, hex_color, tasks } = parameters;
    let { due_date } = parameters;

    try {
      if (!id) throw new Error('Milestone "id" is required');
      if (!campaign_id) throw new Error('"campaign_id" is required');
      if (!tasks) throw new Error('"tasks" is required and must be an array');

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

      logger.info('Updating milestone with payload:', payload);

      const result = await updateMilestoneWithinCampaign(
        id,
        payload,
        authData
      );

      return { milestone: result };

    } catch (error: any) {
      console.error('Error updating milestone:', error.message);
      throw new Error('Failed to update milestone in CMP');
    }
  }

  private async getChildCampaigns(parameters: any, authData: OptiAuthData) {
    const { campaign_id } = parameters;

    if (!campaign_id) {
      throw new Error('campaign_id is required');
    }

    try {
      const tree = await getCampaignTree(campaign_id, authData);
      return tree;
    } catch (error: any) {
      logger.error('Error fetching child campaigns:', error.message);
      throw new Error('Failed to fetch child campaigns from CMP');
    }
  }

  private async getCampaignTasks(parameters: any, authData: OptiAuthData) {
    const { campaign_id } = parameters;

    console.log('[Opal][getCampaignTasks] Params:', parameters);
    console.log('[Opal][getCampaignTasks] Auth org_sso_id:', authData.credentials.org_sso_id);


    if (!campaign_id) {
      throw new Error('campaign_id is required');
    }

    try {
      const tasks = await getAllTasksForCampaign(campaign_id, authData);
      console.log('[Opal][getCampaignTasks] Returning tasks:', tasks.length);
      return { tasks };
    } catch (error: any) {
      logger.error('Error fetching campaign tasks:', error.message);
      throw new Error('Failed to fetch campaign tasks from CMP');
    }
  }
}
