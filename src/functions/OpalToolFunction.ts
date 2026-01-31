import { logger, Function, Response } from '@zaiusinc/app-sdk';
// import { AuthSection } from '../data/data';
// import { parseExcelFromCmp } from 'OpalToolExcelParse.ts';
import xlsx from 'xlsx';
import axios from 'axios';
import { createMilestoneWithinCampaign, updateMilestoneWithinCampaign, getCampaignTree, getAllTasksForCampaign, getMilestonesWithinCampaign, getAssetFromCMP } from '../cmp';


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
      description: 'Generate Q1 events HTML deck from a CMP Excel asset',
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
    } else if (this.request.path === '/tools/get-milestones-within-campaign') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.getMilestonesWithinCampaign(params, authData);
      return new Response(200, response);

    } else if (this.request.path === '/tools/generate-event-deck-from-excel') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.generateEventDeckFromExcel(params, authData);
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

  private async getMilestonesWithinCampaign(
    parameters: any,
    authData: OptiAuthData
  ) {
    const { campaign_id } = parameters;

    if (!campaign_id) {
      throw new Error('campaign_id is required');
    }

    try {
      const milestones = await getMilestonesWithinCampaign(
        campaign_id,
        authData
      );

      return { milestones };
    } catch (error: any) {
      logger.error('Error fetching milestones:', error.message);
      throw new Error('Failed to fetch milestones from CMP');
    }
  }

  private async generateEventDeckFromExcel(
    parameters: { asset_id: string },
    authData: OptiAuthData
  ) {
    const { asset_id } = parameters;

    if (!asset_id) {
      throw new Error('asset_id is required');
    }

    // 1. Fetch asset + download Excel
    const assetDetails = await getAssetFromCMP(asset_id, authData);
    const buffer = await this.downloadFileAsBuffer(assetDetails.url);
    const workbook = xlsx.read(buffer, { cellDates: true });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      throw new Error('No worksheet found in Excel');
    }

    // 2. Parse rows (skip first 10 rows, header at row 11)
    const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, {
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

    // 3. Normalize rows
    const normalized = rows.flatMap(row => {
      if (!row['Event Begin Date'] || !row['LOB Description'] || !row['Title']) {
        return [];
      }

      const start = new Date(row['Event Begin Date']);
      if (isNaN(start.getTime())) return [];

      const month = start.toLocaleString('en-US', { month: 'long' });
      if (!MONTHS_IN_SCOPE.includes(month)) return [];

      const lobs = String(row['LOB Description'])
        .split(',')
        .map(l => l.trim())
        .filter(l => ALLOWED_LOBS.has(l));

      if (!lobs.length) return [];

      const isMultiLob = lobs.length > 1;

      return lobs.map(lob => ({
        month,
        lob,
        category: this.getEventCategory(row['Event Type'] || ''),
        title: row['Title'],
        date: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        stakeholder: this.extractFirst(row['Business Stakeholder']),
        city: this.extractFirst(row['Business Area']),
        isMultiLob
      }));
    });

    // 4. Group data
    const grouped: Record<string, any> = {};

    for (const e of normalized) {
      grouped[e.month] ??= {};
      grouped[e.month][e.lob] ??= { 'in-person': [], online: [] };
      grouped[e.month][e.lob][e.category].push(e);
    }

    // 5. Build HTML
    const html = this.buildEventDeckHtml(grouped);

    return {
      html,
      content_type: 'text/html'
    };
  }

  private buildEventDeckHtml(grouped: Record<string, any>): string {
    let html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Q1 Events Deck</title>
<style>
body { font-family: Calibri, Arial, sans-serif; background:#f9fafb; }
.slide { width:1200px; margin:24px auto; border:2px solid #1D49E2; border-radius:16px; padding:16px 26px; background:#fff; }
h1 { color:#1D49E2; margin:0; }
h2 { color:#4b5563; margin:0 0 12px; }
table { width:100%; border-collapse:collapse; }
th { text-align:left; font-size:16px; }
td { vertical-align:top; width:25%; }
li { font-size:15px; margin-bottom:6px; }
.multi-lob { font-style: italic; }
.online { color:#FF9ACC; }
.meta { font-size:13px; display:block; color:#6b7280; }
.legend { float:right; font-size:12px; font-style:italic; color:#6b7280; }
</style>
</head>
<body>
`;

    for (const month of Object.keys(grouped)) {
      for (const lob of Object.keys(grouped[month])) {
        const inPerson = grouped[month][lob]['in-person'];
        const online = grouped[month][lob].online;

        const render = (arr: any[], isOnline = false) =>
          `<ul>${arr.map(e => `
<li class="${isOnline ? 'online' : ''}">
  <strong class="${e.isMultiLob ? 'multi-lob' : ''}">${e.title}</strong> — ${e.date}
  <span class="meta">Business Stakeholder: ${e.stakeholder}</span>
  <span class="meta">City: ${e.city}</span>
</li>`).join('')}</ul>`;

        html += `
<div class="slide">
  <div class="legend">Italicized event – Event is aligned to more than one LOB</div>
  <h1>${month}</h1>
  <h2>${lob}</h2>
  <table>
    <tr>
      <th>In-Person</th><th>In-Person</th><th>In-Person</th><th>Online</th>
    </tr>
    <tr>
      <td>${render(inPerson.filter((_, i) => i % 3 === 0))}</td>
      <td>${render(inPerson.filter((_, i) => i % 3 === 1))}</td>
      <td>${render(inPerson.filter((_, i) => i % 3 === 2))}</td>
      <td>${render(online, true)}</td>
    </tr>
  </table>
</div>`;
      }
    }

    return html + `</body></html>`;
  }


  private extractFirst(value: string): string {
    return (
      String(value || '')
        .split(/[,;]/)
        .map(v => v.trim())
        .filter(Boolean)[0] || '—'
    );
  }

  private getEventCategory(eventType = ''): 'in-person' | 'online' {
    const v = eventType.toLowerCase();
    if (v.includes('online') || v.includes('webcast') || v.includes('virtual')) {
      return 'online';
    }
    return 'in-person';
  }

  private async downloadFileAsBuffer(url: string): Promise<Buffer> {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(res.data);
  }



}
