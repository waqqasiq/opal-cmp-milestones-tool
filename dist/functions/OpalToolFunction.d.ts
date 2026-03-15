import { Function, Response } from '@zaiusinc/app-sdk';
/**
 * class that implements the Opal tool functions. Requirements:
 * - Must extend the Function class from the SDK
 * - Name must match the value of entry_point property from app.yml manifest
 * - Name must match the file name
 */
export declare class OpalToolFunction extends Function {
    /**
     * Processing the request from Opal
     * Add your logic here to handle every tool declared in the discoveryPayload.
     */
    perform(): Promise<Response>;
    private excelLookupMerge;
    private csvMergeLookup;
    private excelLookupToCsvFile;
    private downloadOpalFile;
    private dynamicLookupExcel;
    private extractAuthData;
    private extractParameters;
    private createMilestoneWithinCampaign;
    private updateMilestoneWithinCampaign;
    private getChildCampaigns;
    private getCampaignTasks;
    private getMilestonesWithinCampaign;
    private generateEventDeckFromExcel;
    private buildSlidesJson;
    private extractFirst;
    private getEventCategory;
    private downloadFileAsBuffer;
}
