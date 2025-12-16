// import axios from 'axios';
import axios, { AxiosResponse } from 'axios';
import { CMP_BASE_URL } from './config';
// import { AuthData } from './types/auth';

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

interface CmpCampaign {
  id: string;
  title: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  is_hidden: boolean;
  status: string;
  reference_id?: string;
  links: {
    self: string;
    parent_campaign: string | null;
    child_campaigns: string[];
  };
}


function generateNumericId() {
  let id = '';
  for (let i = 0; i < 10; i++) {
    id += Math.floor(Math.random() * 10); // digits 0-9
  }
  return id;
}


export const createMilestoneWithinCampaign = async (
  campaignId: string,
  milestoneData: {
    title: string;
    description?: string | null;
    due_date: string;
    hex_color: string;
    tasks?: Array<{ id: string }>;
  },
  authData: OptiAuthData
) => {
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
    if (
      milestoneData.tasks &&
      !milestoneData.tasks.every((t) => t.id)
    ) {
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

    const url = `${CMP_BASE_URL}/v3/milestones`;

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

    const res: AxiosResponse = await axios.post(url, requestBody, { headers });

    return res.data;
  } catch (error: any) {
    console.error('Failed to create milestone:', error.message);

    if (axios.isAxiosError(error) && error.response) {
      console.error('CMP Error:', error.response.data);
    }

    throw error;
  }
};

export const updateMilestoneWithinCampaign = async (
  milestoneId: string,
  updateData: {
    title?: string;
    description?: string | null;
    campaign_id: string; // required
    due_date?: string;
    hex_color?: string;
    tasks: Array<{ id: string }>; // required
  },
  authData: OptiAuthData
) => {
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

    const url = `${CMP_BASE_URL}/v3/milestones/${milestoneId}`;

    console.log('CMP Update Milestone Payload:', updateData);

    const res: AxiosResponse = await axios.patch(url, updateData, { headers });

    return res.data;
  } catch (error: any) {
    console.error('Failed to update milestone:', error.message);

    if (axios.isAxiosError(error) && error.response) {
      console.error('CMP Error:', error.response.data);
    }

    throw error;
  }
};

export const getCampaignById = async (
  campaignId: string,
  authData: OptiAuthData
) => {
  const headers = {
    Accept: 'application/json',
    'x-auth-token-type': 'opti-id',
    Authorization: `${authData.credentials.token_type} ${authData.credentials.access_token}`,
    'Accept-Encoding': 'gzip',
    'x-request-id': generateNumericId(),
    'x-org-sso-id': authData.credentials.org_sso_id
  };

  const url = `${CMP_BASE_URL}/v3/campaigns/${campaignId}`;

  const res: AxiosResponse<CmpCampaign> = await axios.get(url, { headers });
  return res.data;
};

export interface CampaignTreeNode {
  id: string;
  title: string;
  status: string;
  is_hidden: boolean;
  start_date?: string | null;
  end_date?: string | null;
  reference_id?: string;
  children: CampaignTreeNode[];
}

interface CmpTask {
  id: string;
  title: string;
  status: string;
  campaign_id: string;
  milestone_id?: string | null;
  workflow_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
}

interface CmpTaskListResponse {
  data: CmpTask[];
  meta?: {
    total?: number;
  };
}

export const getCampaignTree = async (
  campaignId: string,
  authData: OptiAuthData,
  visited = new Set<string>()
): Promise<CampaignTreeNode | null> => {

  if (visited.has(campaignId)) {
    return null; // safety guard
  }
  visited.add(campaignId);

  const campaign = await getCampaignById(campaignId, authData);

  const children: any[] = [];
  const childUrls = campaign.links?.child_campaigns || [];

  for (const childUrl of childUrls) {
    const childId = childUrl.split('/').pop();
    if (!childId) continue;

    const childTree = await getCampaignTree(childId, authData, visited);
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

export const getTasksPage = async (
  campaignId: string,
  offset: number,
  pageSize: number,
  authData: OptiAuthData
): Promise<CmpTask[]> => {

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

  const res: AxiosResponse<CmpTaskListResponse> = await axios.get(
    `${CMP_BASE_URL}/v3/tasks`,
    { headers, params }
  );

  console.log(
    '[CMP][getTasksPage] Response status:',
    res.status
  );

  console.log(
    '[CMP][getTasksPage] Response keys:',
    Object.keys(res.data || {})
  );

  console.log(
    '[CMP][getTasksPage] Raw response:',
    JSON.stringify(res.data, null, 2)
  );

  return res.data.data ?? [];
};

export const getAllTasksForCampaign = async (
  campaignId: string,
  authData: OptiAuthData
): Promise<CmpTask[]> => {

  const PAGE_SIZE = 100;
  let offset = 0;
  let allTasks: CmpTask[] = [];

  console.log('[CMP][getAllTasksForCampaign] Start');
  console.log('[CMP][getAllTasksForCampaign] Campaign ID:', campaignId);

  while (true) {
    console.log(
      `[CMP][getAllTasksForCampaign] Fetching page: offset=${offset}`
    );
    
    const tasks = await getTasksPage(
      campaignId,
      offset,
      PAGE_SIZE,
      authData
    );

    console.log(
      `[CMP][getAllTasksForCampaign] Fetched ${tasks.length} tasks`
    );

    allTasks = allTasks.concat(tasks);

    if (tasks.length < PAGE_SIZE) {
      console.log('[CMP][getAllTasksForCampaign] Last page reached');
      break; // no more pages
    }

    offset += PAGE_SIZE;
  }

  console.log(
    '[CMP][getAllTasksForCampaign] Total tasks:',
    allTasks.length
  );

  return allTasks;
};


