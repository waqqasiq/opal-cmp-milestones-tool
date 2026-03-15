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
export declare const createMilestoneWithinCampaign: (campaignId: string, milestoneData: {
    title: string;
    description?: string | null;
    due_date: string;
    hex_color: string;
    tasks?: Array<{
        id: string;
    }>;
}, authData: OptiAuthData) => Promise<any>;
export declare const updateMilestoneWithinCampaign: (milestoneId: string, updateData: {
    title?: string;
    description?: string | null;
    campaign_id: string;
    due_date?: string;
    hex_color?: string;
    tasks: Array<{
        id: string;
    }>;
}, authData: OptiAuthData) => Promise<any>;
export declare const getCampaignById: (campaignId: string, authData: OptiAuthData) => Promise<CmpCampaign>;
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
export declare const getCampaignTree: (campaignId: string, authData: OptiAuthData, visited?: Set<string>) => Promise<CampaignTreeNode | null>;
export declare const getTasksPage: (campaignId: string, offset: number, pageSize: number, authData: OptiAuthData) => Promise<CmpTask[]>;
export declare const getAllTasksForCampaign: (campaignId: string, authData: OptiAuthData) => Promise<CmpTask[]>;
export declare const getMilestonesWithinCampaign: (campaignId: string, authData: OptiAuthData) => Promise<any>;
export declare const getAssetFromCMP: (assetId: string, authData: OptiAuthData) => Promise<any>;
export {};
